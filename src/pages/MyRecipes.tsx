import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from "@uiw/react-md-editor";
import { RecipeTab } from "../types";
import { supabase } from "../lib/supabase";
import { Recipe } from "../types";

// Interface for recipe data with additional status field
interface RecipeWithStatus extends Recipe {
  status?: string;
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

  // Add state for recipes and loading
  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (recipe: RecipeWithStatus) => {
    setEditedInstructions(recipe.instructions || "");
    setIsEditing(true);
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

      // Update the local state
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

  // Fetch recipes when tab changes
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

      let query;

      if (activeTab === "uploaded") {
        // Get recipes created by user
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
            // Consider all recipes processed for now
            status: "processed",
          }))
        );
      } else if (activeTab === "liked" || activeTab === "saved") {
        // Get recipes liked or saved by user
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
          .filter((item) => item.recipes) // Filter out any null items
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
              <h2 className="text-2xl tracking-wider uppercase text-black dark:text-white">
                {selectedUpload.title}
              </h2>
              <p className="mt-2 text-sm tracking-wider text-gray-500 dark:text-gray-400">
                {selectedUpload.description}
              </p>

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
    </div>
  );
}
