import React, { useState, useEffect } from "react";
import {
  Search,
  ArrowUp,
  X as CloseIcon,
  Heart,
  Bookmark,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import MDEditor from "@uiw/react-md-editor";
import { useFoodQuote } from "../hooks/useFoodQuote";

// Mock data for demonstration
const mockRecipes = [
  {
    id: "1",
    title: "Homemade Pizza",
    description: "Classic Italian pizza with fresh toppings",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    ingredients: ["flour", "tomatoes", "mozzarella", "basil"],
    instructions: "1. Make dough\n2. Add toppings\n3. Bake",
    userId: "1",
    createdAt: "2024-02-20",
    likes: 1200,
    saves: 543,
    shares: 218,
  },
  {
    id: "2",
    title: "Beef Stir Fry",
    description: "Quick and easy Asian-inspired dish",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19",
    ingredients: ["beef", "vegetables", "soy sauce"],
    instructions: "1. Cut ingredients\n2. Stir fry\n3. Serve",
    userId: "1",
    createdAt: "2024-02-19",
    likes: 890,
    saves: 321,
    shares: 156,
  },
  {
    id: "3",
    title: "Matcha Latte",
    description: "Creamy Japanese green tea latte",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a",
    ingredients: ["matcha powder", "milk", "honey"],
    instructions: "1. Sift matcha\n2. Add hot water\n3. Froth milk\n4. Combine",
    userId: "1",
    createdAt: "2024-02-18",
    likes: 654,
    saves: 234,
    shares: 98,
  },
  {
    id: "4",
    title: "Korean Bibimbap",
    description: "Colorful rice bowl with vegetables",
    thumbnailUrl: "https://images.unsplash.com/photo-1553163147-622ab57be1c7",
    ingredients: ["rice", "vegetables", "egg", "gochujang"],
    instructions: "1. Cook rice\n2. Prepare toppings\n3. Assemble bowl",
    userId: "1",
    createdAt: "2024-02-17",
    likes: 432,
    saves: 187,
    shares: 76,
  },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export default function Home() {
  const [selectedRecipe, setSelectedRecipe] = useState<
    (typeof mockRecipes)[0] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const [interactions, setInteractions] = useState<
    Record<string, { liked: boolean; saved: boolean }>
  >({});

  // Get a random food quote using our custom hook
  const randomQuote = useFoodQuote();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredRecipes = mockRecipes.filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some((i) =>
        i.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.x > 100) {
      setSelectedRecipe(null);
    }
  };

  const handleSearchFocus = () => {
    setIsMobileSearchFocused(true);
    setSelectedRecipe(null);
  };

  const handleSearchBlur = () => {
    setIsMobileSearchFocused(false);
  };

  const handleEdit = (recipe: (typeof mockRecipes)[0]) => {
    setEditedInstructions(recipe.instructions);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInteraction = (
    e: React.MouseEvent,
    type: string,
    recipeId: string
  ) => {
    e.stopPropagation();

    if (type === "like" || type === "save") {
      setInteractions((prev) => ({
        ...prev,
        [recipeId]: {
          ...prev[recipeId],
          [type === "like" ? "liked" : "saved"]:
            !prev[recipeId]?.[type === "like" ? "liked" : "saved"],
        },
      }));
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="fixed top-16 left-0 right-0 z-20 bg-white dark:bg-dark border-b border-gray-200 dark:border-dark-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="py-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search recipes or ingredients..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-200 text-black dark:text-white focus:border-black dark:focus:border-white focus:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <div className="grid gap-4 pb-6">
            {filteredRecipes.map((recipe) => (
              <motion.div
                key={recipe.id}
                layoutId={`recipe-${recipe.id}`}
                onClick={() =>
                  !isMobileSearchFocused && setSelectedRecipe(recipe)
                }
                className={`cursor-pointer bg-white dark:bg-dark-100 overflow-hidden hover:shadow-sm transition-shadow ${
                  isMobileSearchFocused ? "pointer-events-none" : ""
                }`}
              >
                <div className="aspect-[9/12] relative">
                  <img
                    src={recipe.thumbnailUrl}
                    alt={recipe.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="font-medium text-white tracking-wider uppercase">
                      {recipe.title}
                    </h3>
                    <p className="text-sm text-gray-200 mt-1">
                      {recipe.description}
                    </p>
                  </div>

                  {/* Interaction buttons */}
                  <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-8">
                    <button
                      onClick={(e) => handleInteraction(e, "like", recipe.id)}
                      className="group flex flex-col items-center"
                    >
                      <div className="p-2 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/30 transition-colors">
                        <Heart
                          size={24}
                          className={
                            interactions[recipe.id]?.liked
                              ? "text-red-500 fill-red-500"
                              : "text-white"
                          }
                        />
                      </div>
                      <span className="mt-1 text-sm font-medium text-white">
                        {formatNumber(recipe.likes)}
                      </span>
                    </button>

                    <button
                      onClick={(e) => handleInteraction(e, "save", recipe.id)}
                      className="group flex flex-col items-center"
                    >
                      <div className="p-2 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/30 transition-colors">
                        <Bookmark
                          size={24}
                          className={
                            interactions[recipe.id]?.saved
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-white"
                          }
                        />
                      </div>
                      <span className="mt-1 text-sm font-medium text-white">
                        {formatNumber(recipe.saves)}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="text-center py-8 space-y-2">
              <p className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">
                You've reached the end of the feed
              </p>
              <button
                onClick={scrollToTop}
                className="inline-flex items-center space-x-2 text-sm tracking-wider uppercase text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
              >
                <ArrowUp size={16} />
                <span>Back to top</span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={scrollToTop}
                className="fixed bottom-6 right-6 z-50 bg-black dark:bg-white text-white dark:text-black p-3 rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                <ArrowUp size={20} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedRecipe ? (
          <motion.div
            key="recipe"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            drag="x"
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="fixed md:sticky md:top-24 inset-0 md:h-[calc(100vh-6rem)] bg-white dark:bg-dark-100 md:border border-gray-200 dark:border-dark-200 overflow-auto touch-pan-y"
          >
            <div className="h-48 relative">
              <img
                src={selectedRecipe.thumbnailUrl}
                alt={selectedRecipe.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-100/80 backdrop-blur-sm md:hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-200">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Swipe right to close
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-2xl tracking-wider uppercase text-black dark:text-white">
                {selectedRecipe.title}
              </h2>
              <p className="mt-2 text-sm tracking-wider text-gray-500 dark:text-gray-400">
                {selectedRecipe.description}
              </p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-3">
                    Ingredients
                  </h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
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
                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(selectedRecipe)}
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
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none dark:prose-invert">
                      <pre className="text-sm whitespace-pre-wrap text-black dark:text-white">
                        {selectedRecipe.instructions}
                      </pre>
                    </div>
                  )}
                </div>

                <button className="w-full btn-primary dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black">
                  Generate Shopping List
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="quote"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden md:block fixed md:sticky md:top-24 inset-0 md:h-[calc(100vh-6rem)] bg-white dark:bg-dark-100 md:border border-gray-200 dark:border-dark-200 overflow-auto"
          >
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-lg">
                <div className="relative">
                  <div className="absolute -top-8 -left-8 text-8xl text-black/5 dark:text-white/5">
                    "
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl md:text-3xl font-light leading-relaxed tracking-wide text-black dark:text-white">
                      {randomQuote.text}
                    </p>
                    <p className="mt-6 text-lg tracking-wider text-gray-500 dark:text-gray-400">
                      ~ {randomQuote.author}
                    </p>
                  </div>
                  <div className="absolute -bottom-8 -right-8 text-8xl text-black/5 dark:text-white/5 transform rotate-180">
                    "
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
