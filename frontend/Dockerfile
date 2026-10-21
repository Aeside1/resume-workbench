FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 默认为本地开发后端；并行工作区可通过 --build-arg 注入不同端口。
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# 静态分发 + 同源模式下的 /api/ 反代（两种部署模式共用同一个镜像，见文件内注释）
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
