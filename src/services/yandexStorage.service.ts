import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Проверяем, что все необходимые переменные окружения заданы
if (!process.env.YA_ENDPOINT || !process.env.YA_REGION || !process.env.YA_ACCESS_KEY || !process.env.YA_SECRET_KEY || !process.env.YA_BUCKET) {
  throw new Error('Missing required Yandex.Cloud S3 environment variables!');
}

const s3 = new AWS.S3({
  endpoint: process.env.YA_ENDPOINT,
  region: process.env.YA_REGION,
  accessKeyId: process.env.YA_ACCESS_KEY,
  secretAccessKey: process.env.YA_SECRET_KEY,
});

const BUCKET_NAME = process.env.YA_BUCKET;

/**
 * Функция для загрузки файла в Yandex Object Storage.
 * @param file - Файл из Express.Multer.
 * @param userFolder - Папка пользователя для организации файлов.
 * @returns Промис, который разрешается в ключ (имя) загруженного объекта.
 */
export const uploadFile = async (file: Express.Multer.File, userFolder: string): Promise<string> => {
  const fileName = `${userFolder}/${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const result = await s3.upload(params).promise();
  // Возвращаем Key (уникальное имя файла в бакете), а не Location.
  // URL для доступа лучше генерировать по необходимости (pre-signed URL).
  return result.Key;
};

/**
 * Функция для получения списка файлов пользователя с временными URL для доступа.
 * @param userFolder - Папка пользователя.
 * @returns Промис, который разрешается в массив объектов с информацией о файлах.
 */
export const listUserFiles = async (userFolder: string) => {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: `${userFolder}/`,
  };

  const data = await s3.listObjectsV2(params).promise();
  
  if (!data.Contents || data.Contents.length === 0) {
    return [];
  }

  // Генерируем подписанные URL для каждого файла, чтобы к ним можно было получить доступ
  const filesWithSignedUrls = await Promise.all(
    data.Contents.map(async (item) => {
      const signedUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: BUCKET_NAME,
        Key: item.Key!,
        Expires: 3600, // URL будет действителен 1 час
      });

      return {
        key: item.Key!, // Полный ключ объекта
        name: item.Key!.replace(`${userFolder}/`, ''),
        url: signedUrl, // Безопасный временный URL для доступа
        lastModified: item.LastModified,
        size: item.Size,
      };
    })
  );

  return filesWithSignedUrls;
};

/**
 * 
 * Функция для удаления файла из Yandex Object Storage.
 * @param fileKey - Полный ключ объекта, который нужно удалить.
 */
export const deleteFile = async (fileName: string, userId: string): Promise<{ success: boolean; key: string }> => {
  // Формируем полный ключ объекта, как он хранится в S3
  const key = `${userId}/${fileName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key, // -> 'user1/track1.mp3'
  };

  try {
    // Отправляем команду на удаление объекта
    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted ${key} from bucket ${BUCKET_NAME}`);
    // Можно ничего не возвращать или вернуть подтверждение
    return { success: true, key: key };
  } catch (error) {
    console.error(`Error deleting object ${key} from bucket ${BUCKET_NAME}:`, error);
    // Пробрасываем ошибку выше, чтобы ее поймал блок catch в роутере
    throw error;
  }
};