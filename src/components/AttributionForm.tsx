import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface AttributionFormProps {
  recipeId: string;
  onSubmit: () => void;
}

export function AttributionForm({ recipeId, onSubmit }: AttributionFormProps) {
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [socialHandles, setSocialHandles] = useState<string[]>([]);
  const [socialHandleInput, setSocialHandleInput] = useState("");
  const [platform, setPlatform] = useState("instagram");

  useEffect(() => {
    async function fetchRecipeData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("attribution_name, attribution_url, social_handles")
          .eq("id", recipeId)
          .single();

        if (error) throw error;

        if (data) {
          setAuthorName(data.attribution_name || "");
          setOriginalUrl(data.attribution_url || "");
          setSocialHandles(data.social_handles || []);
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

    try {
      const { error } = await supabase
        .from("recipes")
        .update({
          attribution_name: authorName,
          attribution_url: originalUrl,
          social_handles: socialHandles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipeId);

      if (error) throw error;

      onSubmit();
    } catch (error) {
      console.error("Error updating attribution:", error);
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
        <label className="block mb-1">Original Content URL</label>
        <input
          type="url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block mb-1">Social Media Handles</label>
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
            <p className="text-gray-500 italic">No social handles added yet.</p>
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
