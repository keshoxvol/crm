FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

# Отдельный слой для зависимостей — пересобирается только при изменении build.gradle
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon dependencies

COPY src src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
