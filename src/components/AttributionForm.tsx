import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface AttributionFormProps {
  recipeId: string;
  onSubmit: () => void;
}


export function AttributionForm({ recipeId, onSubmit }: AttributionFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [socialHandleInput, setSocialHandleInput] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [socialHandles, setSocialHandles] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRecipeData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select(
            "attribution, attribution_name, attribution_url, social_handles"
          )
          .eq("id", recipeId)
          .single();

        if (error) throw error;

        if (data) {
          // Set legacy attribution fields
          setAuthorName(data.attribution_name || "");
          setSocialHandles(data.social_handles || []);

          // Parse the new attribution JSON field if it exists
          if (data.attribution) {
            try {
              // Try to parse as JSON
              const attributionObj =
                typeof data.attribution === "string"
                  ? JSON.parse(data.attribution)
                  : data.attribution; // Handle if it's already an object

              // Set state with values from the attribution field
              setSocialUrl(attributionObj.handle || "");
              setOriginalUrl(
                attributionObj.original_url || data.attribution_url || ""
              );
            } catch {
              console.error("Failed to parse attribution JSON");
              // If parsing fails, fall back to legacy fields
              setOriginalUrl(data.attribution_url || "");
            }
          } else {
            // If no attribution JSON, use legacy fields
            setOriginalUrl(data.attribution_url || "");
          }
        }
      } catch (error) {
        console.error("Error fetching recipe data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecipeData();
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate URLs
    const urlPattern =
      /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;

    if (socialUrl && !urlPattern.test(socialUrl)) {
      setError(
        "Please enter a valid social media URL (e.g., https://www.instagram.com/username/)"
      );
      return;
    }

    if (originalUrl && !urlPattern.test(originalUrl)) {
      setError("Please enter a valid content URL");
      return;
    }

    try {
      // Format attribution as JSON object matching the structure used in other components
      const formattedAttribution = {
        handle: socialUrl.trim(),
        original_url: originalUrl.trim(),
      };

      // Create a string version for the attribution field
      const attributionString =
        socialUrl.trim() || originalUrl.trim()
          ? JSON.stringify(formattedAttribution)
          : "";

      const { error } = await supabase
        .from("recipes")
        .update({
          attribution: attributionString,
          attribution_name: authorName, // Keep updating legacy fields for backward compatibility
          attribution_url: originalUrl,
          social_handles: socialHandles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipeId);

      if (error) throw error;

      onSubmit();
    } catch (error) {
      console.error("Error updating attribution:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const addSocialHandle = () => {
    if (socialHandleInput) {
      const newHandle = `${platform}:${socialHandleInput}`;
      if (!socialHandles.includes(newHandle)) {
        setSocialHandles([...socialHandles, newHandle]);
      }
      setSocialHandleInput("");
    }
  };

  const removeSocialHandle = (handle: string) => {
    setSocialHandles(socialHandles.filter((h) => h !== handle));
  };

  const renderSocialHandleBadge = (handle: string) => {
    const [platform, username] = handle.split(":");
    return (
      <div className="inline-flex items-center px-2 py-1 mr-2 mb-2 bg-gray-100 rounded-full">
        <span className="mr-1">{platform}:</span>
        <span className="font-medium">@{username}</span>
        <button
          type="button"
          onClick={() => removeSocialHandle(handle)}
          className="ml-1 text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block mb-1">Author/Creator Name</label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="Enter the original creator's name"
        />
      </div>

      <div>
        <label htmlFor="socialUrl" className="block mb-1">
          Social Media URL
        </label>
        <input
          type="url"
          id="socialUrl"
          value={socialUrl}
          onChange={(e) => setSocialUrl(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="https://www.instagram.com/username/"
        />
      </div>

      <div>
        <label htmlFor="originalUrl" className="block mb-1">
          Original Content URL
        </label>
        <input
          type="url"
          id="originalUrl"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="https://www.example.com/original-video"
        />
      </div>

      <div>
        <label className="block mb-1">Additional Social Media Handles</label>
        <div className="flex mb-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 border rounded-l"
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="twitter">Twitter</option>
          </select>
          <input
            type="text"
            value={socialHandleInput}
            onChange={(e) => setSocialHandleInput(e.target.value)}
            className="flex-1 px-3 py-2 border-t border-b border-r rounded-r"
            placeholder="username (without @)"
          />
          <button
            type="button"
            onClick={addSocialHandle}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>

        <div className="mt-2">
          {socialHandles.length > 0 ? (
            <div className="flex flex-wrap">
              {socialHandles.map((handle) => renderSocialHandleBadge(handle))}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No additional social handles added yet.
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Save Attribution
        </button>
      </div>
    </form>
  );
}
