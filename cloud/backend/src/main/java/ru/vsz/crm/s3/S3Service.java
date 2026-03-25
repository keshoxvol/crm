package ru.vsz.crm.s3;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

@Service
public class S3Service {

    private final String bucket;
    private final S3Client client;
    private final S3Presigner presigner;
    private final boolean configured;

    public S3Service(
            @Value("${s3.endpoint:}") String endpoint,
            @Value("${s3.access-key:}") String accessKey,
            @Value("${s3.secret-key:}") String secretKey,
            @Value("${s3.bucket:}") String bucket,
            @Value("${s3.region:ru-1}") String region) {
        this.bucket = bucket;
        this.configured = !endpoint.isBlank() && !accessKey.isBlank() && !secretKey.isBlank() && !bucket.isBlank();

        if (configured) {
            var credentials = StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
            this.client = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(credentials)
                    .region(Region.of(region))
                    .forcePathStyle(true)
                    .build();
            this.presigner = S3Presigner.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(credentials)
                    .region(Region.of(region))
                    .build();
        } else {
            this.client = null;
            this.presigner = null;
        }
    }

    public boolean isConfigured() {
        return configured;
    }

    public void upload(String key, InputStream inputStream, String contentType, long size) {
        requireConfigured();
        client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromInputStream(inputStream, size));
    }

    public String presignedDownloadUrl(String key, Duration expiration) {
        requireConfigured();
        return presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(expiration)
                        .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
                        .build())
                .url().toString();
    }

    public void delete(String key) {
        requireConfigured();
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    private void requireConfigured() {
        if (!configured) throw new IllegalStateException("S3 не настроен");
    }
}
