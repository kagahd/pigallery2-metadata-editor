#!/bin/bash

METADATA_API_PORT=9089

echo "Start Metadata-API on port ${METADATA_API_PORT} ..."
cd /exifapi
FLASK_APP=app.py flask run --host=0.0.0.0 --port=${METADATA_API_PORT} &
FLASK_PID=$!

sleep 2

if kill -0 $FLASK_PID 2>/dev/null; then
  echo "✅ Metadata-API is running with PID $FLASK_PID"
else
  echo "❌ Error: Metadata-API could not be started."
fi

# Start PiGallery2
cd /app
echo "Start PiGallery2..."
exec node ./src/backend/index.js --expose-gc --config-path="/app/data/config/config.json"
