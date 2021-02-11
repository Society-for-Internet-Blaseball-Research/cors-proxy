FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY index.txt /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/
