FROM bpatrik/pigallery2:2.0.0-debian-bullseye

WORKDIR /app

# install Python + ExifTool + Flask
RUN apt-get update && \
    apt-get install -y python3 python3-pip libimage-exiftool-perl && \
    pip3 install flask flask-cors && \
    apt-get clean

# copy Metadata-API & static UI files (inkl. start.sh)
COPY ./exifapi /exifapi

# make start script runnable
RUN chmod +x /exifapi/start.sh

# start both Metadata-API and PiGallery2
ENTRYPOINT ["/exifapi/start.sh"]

