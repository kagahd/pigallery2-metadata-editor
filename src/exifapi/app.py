from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from pathlib import Path
import shutil
import subprocess
import json

app = Flask(__name__, static_folder="/exifapi/ui")
CORS(app)

# ⬇ UI-Routen
@app.route("/meta/")
@app.route("/meta")
def redirect_to_index():
    return redirect("/meta/index.html")

@app.route("/meta/index.html")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/meta/script.js")
def serve_script():
    return send_from_directory(app.static_folder, "script.js")


# Write metadata
@app.route("/write", methods=["POST"])
def write_metadata():
    data = request.json
    file_path = data.get("file")
    tags = data.get("tags", {})

    if not file_path or not tags:
        return jsonify({"error": "file and tags are required"}), 400

    overwrite = data.get("overwrite", False)
    backup_created = None

    # Create backup file if overwrite = False
    if not overwrite:
        original = Path(file_path)
        counter = 0
        while True:
            suffix = "_original" if counter == 0 else f"_original_{counter}"
            backup_path = original.with_name(original.stem + suffix + original.suffix)
            if not backup_path.exists():
                shutil.copy2(original, backup_path)
                backup_created = str(backup_path)
                print(f"🧾 Backup created: {backup_created}")
                break
            counter += 1

    # Build ExifTool command
    cmd = ["exiftool", "-config", "/exifapi/ExifTool_config", "-overwrite_original"]
    for k, v in tags.items():
        if isinstance(v, list):
            for entry in v:
                cmd.append(f"-{k}={entry}")
        else:
            cmd.append(f"-{k}={v}")

    cmd.append(file_path)
    print("→ ExifTool-Befehl:", " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return jsonify({
            "success": True,
            "stdout": result.stdout,
            "command": " ".join(cmd),
            "backup": backup_created
        })
    except subprocess.CalledProcessError as e:
        return jsonify({
            "error": e.stderr,
            "command": " ".join(cmd),
            "backup": backup_created
        }), 500



# read metadata
@app.route("/read", methods=["POST"])
def read_metadata():
    data = request.json
    file_path = data.get("file")

    if not file_path:
        return jsonify({"error": "file is required"}), 400

    tags_to_read = [
        "-XMP-fstop:Favorite",
        "-XMP-xmp:Rating",
        "-XMP-dc:Subject"
    ]

    cmd = ["exiftool", "-config", "/exifapi/ExifTool_config", "-j"] + tags_to_read + [file_path]
    print("→ ExifTool (READ):", " ".join(cmd))

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)[0]
        return jsonify({"tags": metadata})
    except subprocess.CalledProcessError as e:
        return jsonify({"error": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

