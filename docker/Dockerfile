FROM python:3.5
RUN curl -sL "https://deb.nodesource.com/setup_8.x" | bash -
RUN apt install -y nodejs
RUN pip install --upgrade pip
RUN python -m pip install pillow opencv-python matplotlib pandas h5py tqdm sklearn keras tensorflow
WORKDIR /workdir/
ARG PORT
ENV PORT=$PORT
ARG WORKSPACE_PATH
ENV WORKSPACE_PATH=$WORKSPACE_PATH
ARG PY_PATH
ENV PY_PATH=$PY_PATH
RUN mkdir -p /workdir/model/uploads /workdir/model/savedImages
COPY ./sketchme-api/package.json /workdir/package.json
# RUN ln -s ./sketchme-api/package.json /workdir/package.json
RUN cd /workdir/ && npm i
ENV PATH=/workdir/node_modules/.bin/:$PATH
# COPY ./sketchme-api/scripts/init.sh /scripts/init.sh
COPY ./sketchme-api/ /workdir/api/
COPY ./sketch2pix/Sketch /workdir/model/Sketch/
COPY ./sketch2pix/dataset/PencilSketch /workdir/model/dataset/PencilSketch
RUN mkdir -p /workdir/model/Sketch/results
EXPOSE 80
CMD cd /workdir/api && npm start

