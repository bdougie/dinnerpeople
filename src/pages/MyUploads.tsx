import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MDEditor from '@uiw/react-md-editor';

// Mock data
const mockUploads = [
  {
    id: '1',
    title: 'Homemade Pasta',
    description: 'Fresh pasta made from scratch',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
    createdAt: '2024-02-18',
    status: 'processed',
    ingredients: ['flour', 'eggs', 'salt', 'olive oil'],
    instructions: '1. Mix flour and salt\n2. Create a well and add eggs\n3. Knead dough\n4. Rest for 30 minutes\n5. Roll and cut',
  },
  {
    id: '2',
    title: 'Chocolate Cake',
    description: 'Decadent chocolate layer cake',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
    createdAt: '2024-02-17',
    status: 'processing',
    ingredients: ['flour', 'cocoa powder', 'sugar', 'eggs', 'butter'],
    instructions: '1. Mix dry ingredients\n2. Cream butter and sugar\n3. Combine wet and dry\n4. Bake at 350°F',
  },
];

export default function MyUploads() {
  const [selectedUpload, setSelectedUpload] = useState<typeof mockUploads[0] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');

  const handleEdit = (upload: typeof mockUploads[0]) => {
    setEditedInstructions(upload.instructions);
    setIsEditing(true);
  };

  const handleSave = () => {
    // In a real app, this would update the database
    setIsEditing(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl tracking-wider uppercase text-black dark:text-white">My Uploads</h1>
          <p className="mt-2 text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">Manage your cooking videos</p>
        </div>

        <div className="grid gap-4">
          {mockUploads.map((upload) => (
            <motion.div
              key={upload.id}
              layoutId={`upload-${upload.id}`}
              onClick={() => setSelectedUpload(upload)}
              className="cursor-pointer bg-white dark:bg-dark-100 overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="aspect-[9/12] relative">
                <img
                  src={upload.thumbnailUrl}
                  alt={upload.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {upload.status === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mx-auto"></div>
                      <p className="mt-2 text-white text-sm tracking-wider uppercase">Processing...</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h3 className="font-medium text-white tracking-wider uppercase">{upload.title}</h3>
                  <p className="text-sm text-gray-200 mt-1">{upload.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-300">
                      {new Date(upload.createdAt).toLocaleDateString()}
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
                src={selectedUpload.thumbnailUrl}
                alt={selectedUpload.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {selectedUpload.status === 'processing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mx-auto"></div>
                    <p className="mt-2 text-white text-sm tracking-wider uppercase">Processing...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <h2 className="text-2xl tracking-wider uppercase text-black dark:text-white">{selectedUpload.title}</h2>
              <p className="mt-2 text-sm tracking-wider text-gray-500 dark:text-gray-400">{selectedUpload.description}</p>

              <div className="mt-8 space-y-8">
                <div>
                  <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedUpload.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm text-black dark:text-white">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm tracking-wider uppercase text-gray-500 dark:text-gray-400">Instructions</h3>
                    {!isEditing && selectedUpload.status === 'processed' && (
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
                        onChange={(val) => setEditedInstructions(val || '')}
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
                        {selectedUpload.instructions}
                      </pre>
                    </div>
                  )}
                </div>

                {selectedUpload.status === 'processed' && (
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