// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3007);
// }
// bootstrap();


// // src/main.ts (orders-service)
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
  
//   // Enable global validation pipe and prefix
//   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

//   const port = process.env.PORT || 3007;
//   await app.listen(port);

//   console.log(`Orders Service (HTTP) running on port ${port}`);
// }
// bootstrap();


// src/main.ts (orders-service)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 💡 Added ConfigService for robustness

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation pipe and prefix
  // whitelist: true removes properties not defined in DTOs
  // transform: true automatically converts query/path params and request body data types
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Get port from configuration
  const configService = app.get(ConfigService);
  // Default to 3007 if not specified in environment
  const port = configService.get<number>('PORT') || 3007; 
  
  await app.listen(port);

  console.log(`Orders Service (HTTP) running on port ${port}`);
}
bootstrap();