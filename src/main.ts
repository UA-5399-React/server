import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppLogger } from './logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  const config = new DocumentBuilder()
    .setTitle('Server API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  appLogger.log(`Server started on port ${port}`, 'Bootstrap');
  appLogger.log(`Swagger: http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
