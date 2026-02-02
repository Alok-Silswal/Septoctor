FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV ML_API_BASE=https://example.com
ENV NEXT_PUBLIC_ML_API_BASE=https://example.com
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app ./
EXPOSE 8080
CMD ["npm", "start"]
