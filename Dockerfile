FROM ubuntu:latest
LABEL authors="taras"
WORKDIR /src
COPY pom.xml ./
COPY backend/pom.xml backend/pom.xml
RUN mvn -B -q -pl backend -am dependency:go-offline
COPY backend/src backend/src
RUN mvn -B -q -pl backend -am -DskipTests package \
    && cp backend/target/backend-*.jar /src/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/app.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]