import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from "@uiw/react-md-editor";
import { RecipeTab } from "../types";
import { supabase } from "../lib/supabase";
import { Recipe } from "../types";

// Helper function to extract handle from URL
function extractHandleFromUrl(url: string): string {
  try {
    // Remove trailing slash if present
    const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    // Get the last part of the URL path
    const parts = new URL(cleanUrl).pathname.split("/").filter(Boolean);
    const handle = parts[parts.length - 1];
    return handle ? `@${handle}` : url;
  } catch (e) {
    // If URL parsing fails, return the original string
    return url;
  }
}

// Interface for recipe data with additional status field
interface RecipeWithStatus extends Recipe {
  status?: string;
  attribution?: string;
}

// Default fallback image for recipes without thumbnails
const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1531928351158-2f736078e0a1?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function MyRecipes() {
  const [selectedUpload, setSelectedUpload] = useState<RecipeWithStatus | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState("");
  const [activeTab, setActiveTab] = useState<RecipeTab>("uploaded");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    title: "",
    description: "",
    attribution: "",
    social: "",
    videoUrl: "",
  });

  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleEdit = (recipe: RecipeWithStatus) => {
    setEditedInstructions(recipe.instructions || "");
    setIsEditing(true);
  };

  const handleEditDetails = (recipe: RecipeWithStatus) => {
    let social = "";
    let videoUrl = "";

    if (recipe.attribution) {
      try {
        const attributionObj = JSON.parse(recipe.attribution);
        social = attributionObj.handle || "";
        videoUrl = attributionObj.original_url || "";
      } catch (e) {
        social = "";
        videoUrl = "";
      }
    }

    setEditedDetails({
      title: recipe.title || "",
      description: recipe.description || "",
      attribution: recipe.attribution || "",
      social,
      videoUrl,
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedUpload) return;

    let socialUrl = editedDetails.social.trim();
    let videoUrl = editedDetails.videoUrl.trim();

    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;

    if (socialUrl && !urlPattern.test(socialUrl)) {
      setError(
        "Please enter a valid social media URL (e.g., https://www.instagram.com/username/)"
      );
      return;
    }

    if (videoUrl && !urlPattern.test(videoUrl)) {
      setError("Please enter a valid video URL");
      return;
    }

    const formattedAttribution = {
      handle: socialUrl,
      original_url: videoUrl,
    };

    const attributionString =
      socialUrl || videoUrl ? JSON.stringify(formattedAttribution) : "";

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("recipes")
        .update({
          title: editedDetails.title,
          description: editedDetails.description,
          attribution: attributionString,
        })
        .eq("id", selectedUpload.id);

      if (error) throw error;

      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === selectedUpload.id
            ? {
                ...recipe,
                title: editedDetails.title,
                description: editedDetails.description,
                attribution: attributionString,
              }
            : recipe
        )
      );

      setSelectedUpload((prev) =>
        prev
          ? {
              ...prev,
              title: editedDetails.title,
              description: editedDetails.description,
              attribution: attributionString,
            }
          : null
      );
      setIsEditingDetails(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUpload) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("recipes")
        .update({ instructions: editedInstructions })
        .eq("id", selectedUpload.id);

      if (error) throw error;

      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === selectedUpload.id
            ? { ...recipe, instructions: editedInstructions }
            : recipe
        )
      );

      setSelectedUpload((prev) =>
        prev ? { ...prev, instructions: editedInstructions } : null
      );
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: RecipeTab; label: string }[] = [
    { id: "uploaded", label: "Uploaded" },
    { id: "liked", label: "Liked" },
    { id: "saved", label: "Saved" },
  ];

  useEffect(() => {
    fetchRecipes();
  }, [activeTab]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      if (activeTab === "uploaded") {
        const { data, error } = await supabase
          .from("recipes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRecipes(
          data.map((recipe) => ({
            id: recipe.id,
            title: recipe.title || "Untitled Recipe",
            description: recipe.description || "",
            thumbnailUrl: recipe.thumbnail_url || DEFAULT_THUMBNAIL,
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || "",
            userId: recipe.user_id,
            createdAt: recipe.created_at,
            status: "processed",
          }))
        );
      } else if (activeTab === "liked" || activeTab === "saved") {
        const { data, error } = await supabase
          .from("recipe_interactions")
          .select(
            `
            id,
            recipes:recipe_id (*)
          `
          )
          .eq("user_id", user.id)
          .eq(activeTab === "liked" ? "liked" : "saved", true);

        if (error) throw error;

        const formattedRecipes = data
          .filter((item) => item.recipes)
          .map((item) => ({
            id: item.recipes.id,
            title: item.recipes.title || "Untitled Recipe",
            description: item.recipes.description || "",
            thumbnailUrl: item.recipes.thumbnail_url || DEFAULT_THUMBNAIL,
            ingredients: item.recipes.ingredients || [],
            instructions: item.recipes.instructions || "",
            userId: item.recipes.user_id,
            createdAt: item.recipes.created_at,
            status: "processed",
          }));

        setRecipes(formattedRecipes);
      }
    } catch (err: any) {
      console.error("Error fetching recipes:", err);
      setError(err.message);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl tracking-wider uppercase text-black dark:text-white">
            My Recipes
          </h1>
          <p className="mt-2 text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
            Manage your recipe collection
          </p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-dark-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-2 px-4 text-sm tracking-wider uppercase ${
                activeTab === tab.id
                  ? "text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
                />
              )}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-black/20 dark:border-white/20 border-t-black dark:border-t-white"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded">
            <p>{error}</p>
            <button onClick={fetchRecipes} className="mt-2 text-sm underline">
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && recipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab === "uploaded"
                ? "You haven't uploaded any recipes yet."
                : activeTab === "liked"
                ? "You haven't liked any recipes yet."
                : "You haven't saved any recipes yet."}
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {recipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              layoutId={`upload-${recipe.id}`}
              onClick={() => setSelectedUpload(recipe)}
              className="cursor-pointer bg-white dark:bg-dark-100 overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="aspect-[9/12] relative">
                <img
                  src={recipe.thumbnailUrl || DEFAULT_THUMBNAIL}
                  alt={recipe.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {recipe.status === "processing" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mx-auto"></div>
                      <p className="mt-2 text-white text-sm tracking-wider uppercase">
                        Processing...
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h3 className="font-medium text-white tracking-wider uppercase">
                    {recipe.title}
                  </h3>
                  <p className="text-sm text-gray-200 mt-1">
                    {recipe.description}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-300">
                      {new Date(recipe.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedUpload && (
          <motion.div
            key={`detail-${selectedUpload.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed md:sticky md:top-24 inset-0 md:h-[calc(100vh-6rem)] bg-white dark:bg-dark-100 md:border border-gray-200 dark:border-dark-200 overflow-auto"
          >
            <button
              onClick={() => setSelectedUpload(null)}
              className="md:hidden absolute top-4 right-4 text-gray-500 dark:text-gray-400"
            >
              Close
            </button>

            <div className="h-48 relative">
              <img
                src={selectedUpload.thumbnailUrl || DEFAULT_THUMBNAIL}
                alt={selectedUpload.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {selectedUpload.status === "processing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mx-auto"></div>
                    <p className="mt-2 text-white text-sm tracking-wider uppercase">
                      Processing...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl tracking-wider uppercase text-black dark:text-white">
                  {selectedUpload.title}
                </h2>

                {activeTab === "uploaded" && (
                  <div className="relative">
                    <button
                      className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-300 shadow-lg rounded-md z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDropdownOpen(false);
                            handleEditDetails(selectedUpload);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                        >
                          Edit details
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm tracking-wider text-gray-500 dark:text-gray-400">
                {selectedUpload.description}
              </p>
              {selectedUpload.attribution && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <p className="italic">Attribution:</p>
                  {(() => {
                    try {
                      const attr = JSON.parse(selectedUpload.attribution);
                      return (
                        <div className="mt-1 space-y-1">
                          {attr.handle && (
                            <p>
                              Social:{" "}
                              <a
                                href={attr.handle}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {extractHandleFromUrl(attr.handle)}
                              </a>
                            </p>
                          )}
                          {attr.original_url && (
                            <p>
                              Source:{" "}
                              <a
                                href={attr.original_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {new URL(attr.original_url).hostname}
                              </a>
                            </p>
                          )}
                        </div>
                      );
                    } catch (e) {
                      return selectedUpload.attribution;
                    }
                  })()}
                </div>
              )}

              <div className="mt-8 space-y-8">
                <div>
                  <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-3">
                    Ingredients
                  </h3>
                  <ul className="space-y-2">
                    {selectedUpload.ingredients.map((ingredient, index) => (
                      <li
                        key={index}
                        className="text-sm text-black dark:text-white"
                      >
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
                      Instructions
                    </h3>
                    {!isEditing &&
                      selectedUpload.status === "processed" &&
                      activeTab === "uploaded" && (
                        <button
                          onClick={() => handleEdit(selectedUpload)}
                          className="text-sm tracking-wider uppercase text-black hover:text-gray-500 dark:text-white dark:hover:text-gray-400"
                        >
                          Edit
                        </button>
                      )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <MDEditor
                        value={editedInstructions}
                        onChange={(val) => setEditedInstructions(val || "")}
                        preview="edit"
                      />
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="btn-secondary dark:border-white dark:text-white dark:hover:border-gray-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
                          disabled={isLoading}
                        >
                          {isLoading ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none dark:prose-invert">
                      <pre className="text-sm whitespace-pre-wrap text-black dark:text-white">
                        {selectedUpload.instructions ||
                          "No instructions available"}
                      </pre>
                    </div>
                  )}
                </div>

                {selectedUpload.status === "processed" && (
                  <button className="w-full btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black">
                    Generate Shopping List
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingDetails && selectedUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-200 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg tracking-wider uppercase text-black dark:text-white mb-4">
                Edit Recipe Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={editedDetails.title}
                    onChange={(e) =>
                      setEditedDetails({
                        ...editedDetails,
                        title: e.target.value,
                      })
                    }
                    className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={editedDetails.description}
                    onChange={(e) =>
                      setEditedDetails({
                        ...editedDetails,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                  />
                </div>
                <div>
                  <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-2">
                    Attribution (Optional)
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label
                        htmlFor="social"
                        className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
                      >
                        Social Media URL
                      </label>
                      <input
                        type="url"
                        id="social"
                        placeholder="https://www.instagram.com/username/"
                        className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                        value={editedDetails.social}
                        onChange={(e) =>
                          setEditedDetails({
                            ...editedDetails,
                            social: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="videoUrl"
                        className="block text-sm text-gray-500 dark:text-gray-400 mb-1"
                      >
                        Original Video URL
                      </label>
                      <input
                        type="url"
                        id="videoUrl"
                        placeholder="https://www.example.com/original-video"
                        className="input-control dark:bg-dark-200 dark:border-dark-300 dark:text-white dark:focus:border-white"
                        value={editedDetails.videoUrl}
                        onChange={(e) =>
                          setEditedDetails({
                            ...editedDetails,
                            videoUrl: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setIsEditingDetails(false)}
                    className="btn-secondary dark:border-white dark:text-white dark:hover:border-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    className="btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
