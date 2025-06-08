function showResponse(message, isError = false) {
  const box = document.getElementById("responseBox");
  box.textContent = (isError ? "❌ " : "✅ ") + message;
  box.className = isError ? "error" : "success";
  box.style.display = "block";
}

let apiBaseUrl = "";

async function loadConfig() {
  try {
    const host = window.location.hostname;
    const port = window.location.port || "9089"; // fallback
    apiBaseUrl = `http://${host}:${port}`;
    console.log("📡 Using API endpoint:", apiBaseUrl);
  } catch (err) {
    console.error("❌ Failed to determine API endpoint:", err.message);
    alert("Could not determine API server address.");
  }
}


window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();

  document.getElementById("metaForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const galleryUrl = document.getElementById("galleryUrl").value.trim();
    const rating = parseInt(document.getElementById("rating").value);
    const tags = document.getElementById("tags").value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    let filePath = null;

    try {
      filePath = convertGalleryUrlToPath(galleryUrl);
      console.log("Adapted file path", filePath);
    } catch (err) {
      showResponse(`Error while parsing the URL: ${err.message}`, true);
      return;
    }

    const makeCopy = document.getElementById("makeCopy").checked;
    const favorite = document.getElementById("favorite").checked ? 1 : 0;

    const payload = {
      file: filePath,
      tags: {},
      overwrite: !makeCopy
    };

    payload.tags["Favorite"] = favorite;

    if (!isNaN(rating)) {
      payload.tags["XMP-xmp:Rating"] = rating;
    }

    if (tags.length > 0) {
      payload.tags["XMP:Subject"] = tags;
    }

    console.log("Sent metadata:", payload);

    try {
      const res = await fetch(`${apiBaseUrl}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      document.getElementById("response").textContent = JSON.stringify(json, null, 2);

      if (json.success) {
        let msg = "Metadata saved successfully.";
        if (json.backup) {
          msg += ` Backup created: ${json.backup}`;
        }
        showResponse(msg);
      } else {
        showResponse(`Error: ${json.error || "Unknown error"}`, true);
      }
      console.log(json);
    } catch (err) {
      showResponse(`API error: ${err}`, true);
    }
  });

  document.getElementById("loadMeta").addEventListener("click", async function () {
    const galleryUrl = document.getElementById("galleryUrl").value.trim();
    let filePath;

    try {
      filePath = convertGalleryUrlToPath(galleryUrl);
    } catch (err) {
      showResponse(`Error while parsing the URL: ${err.message}`, true);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: filePath })
      });

      const json = await res.json();

      if (json.error) {
        showResponse("Error while loading metadata: " + json.error, true);
        return;
      }

      console.log("Response from server:", json);
      console.log("Tags:", json.tags);
      document.getElementById("response").textContent = JSON.stringify(json, null, 2);

      if (json.tags) {
        const favoriteRaw = json.tags["Favorite"] || 0;
        const rating = parseInt(json.tags["Rating"]) || "";
        const subject = json.tags["Subject"] || [];

        document.getElementById("favorite").checked = String(favoriteRaw) === "1";
        document.getElementById("rating").value = rating;
        document.getElementById("tags").value = Array.isArray(subject) ? subject.join(", ") : subject;
        showResponse("Metadata loaded successfully.");
      } else {
        showResponse("No metadata found.", false);
      }
    } catch (err) {
      showResponse(`API error: ${err}`, true);
    }
  });
});

function convertGalleryUrlToPath(urlString) {
  const parsed = new URL(urlString);
  const galleryMatch = parsed.pathname.match(/\/gallery\/(.+)/);
  const filename = parsed.searchParams.get("p");

  if (!galleryMatch || !filename) {
    throw new Error("Invalid PiGallery2 URL");
  }

  const decodedDir = decodeURIComponent(galleryMatch[1]);
  return `/app/data/images/${decodedDir}/${filename}`;
}

