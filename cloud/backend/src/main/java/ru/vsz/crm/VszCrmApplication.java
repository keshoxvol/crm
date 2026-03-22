package ru.vsz.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VszCrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(VszCrmApplication.class, args);
    }
}
