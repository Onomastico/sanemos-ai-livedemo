# Dockerfile for Cloud Run deployment via cloudbuild.yaml
# Build args are passed automatically by cloudbuild.yaml

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_GEMINI_API_KEY
ARG NEXT_PUBLIC_ACCESS_CODE
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_PUBLIC_ACCESS_CODE=$NEXT_PUBLIC_ACCESS_CODE
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
