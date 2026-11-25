FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
ENV NGINX_ENVSUBST_FILTER=^BRAND_API_TOKEN$
ENV BRAND_API_TOKEN=""
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build/prod/ /usr/share/nginx/html/
EXPOSE 80
