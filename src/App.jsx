import { useEffect, useState } from "react";

import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";

import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl, remove } from "aws-amplify/storage";

const client = generateClient();

export default function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null,
  });

  async function fetchNotes() {
    try {
      const { data } = await client.models.Note.list();
      const notesWithUrls = await Promise.all(
        (data || []).map(async (note) => {
          if (!note.image) return note;

          const { url } = await getUrl({
            path: note.image,
          });

          return { ...note, imageUrl: url.toString() };
        })
      );

      setNotes(notesWithUrls);
    } catch (err) {
      console.log("error fetching notes:", err);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  function onChange(e) {
    const { name, value, files } = e.target;

    if (name === "image" && files && files[0]) {
      setFormData((current) => ({ ...current, image: files[0] }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function createNote(e) {
    e.preventDefault();

    if (!formData.name || !formData.description) return;

    try {
      let imagePath;

      // Create a unique storage path if an image was selected
      if (formData.image) {
        imagePath = `media/${Date.now()}-${formData.image.name}`;

        await uploadData({
          path: imagePath,
          data: formData.image,
        }).result;
      }

      await client.models.Note.create({
        name: formData.name,
        description: formData.description,
        image: imagePath,
      });

      setFormData({ name: "", description: "", image: null });
      await fetchNotes();
    } catch (err) {
      console.log("error creating note:", err);
    }
  }

  async function deleteNote(note) {
    try {
      if (note.image) {
        await remove({ path: note.image });
      }

      await client.models.Note.delete({ id: note.id });
      await fetchNotes();
    } catch (err) {
      console.log("error deleting note:", err);
    }
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
          <header style={{ display: "flex", justifyContent: "space-between" }}>
            <h1>Notes App</h1>
            <div>
              <span style={{ marginRight: 12 }}>
                {user?.signInDetails?.loginId || user?.username}
              </span>
              <button onClick={signOut}>Sign out</button>
            </div>
          </header>

          <form onSubmit={createNote} style={{ marginTop: 20 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                name="name"
                placeholder="Note name"
                value={formData.name}
                onChange={onChange}
              />
              <input
                name="description"
                placeholder="Note description"
                value={formData.description}
                onChange={onChange}
              />
              <input name="image" type="file" accept="image/*" onChange={onChange} />
              <button type="submit">Create note</button>
            </div>
          </form>

          <section style={{ marginTop: 30 }}>
            <h2>Current Notes</h2>

            {notes.length === 0 ? (
              <p>No notes yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>{note.name}</h3>
                    <p style={{ marginTop: 6 }}>{note.description}</p>

                    {note.imageUrl && (
                      <img
                        src={note.imageUrl}
                        alt={note.name}
                        style={{ maxWidth: 240, borderRadius: 8 }}
                      />
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => deleteNote(note)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}
    </Authenticator>
  );
}
