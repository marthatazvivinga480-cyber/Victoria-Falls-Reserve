import mongoose from 'mongoose';
import { env } from './config.js';
import { Hotel, Room } from './models.js';
import { hotelPhotos, roomPhotos } from './photo-manifest.js';
try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  let hotels = 0;
  let rooms = 0;
  await mongoose.connection.transaction(async (session) => {
    hotels = 0;
    rooms = 0;
    for (const [name, image] of Object.entries(hotelPhotos)) {
      const hotel = await Hotel.findOneAndUpdate(
        { name },
        { $set: { image } },
        { new: true, session },
      );
      if (!hotel) continue;
      hotels++;
      for (const [roomName, roomImage] of Object.entries(roomPhotos[name])) {
        const result = await Room.updateOne(
          { hotel: hotel._id, name: roomName },
          { $set: { image: roomImage } },
          { session },
        );
        rooms += result.matchedCount;
      }
    }
  });
  console.log(
    `Photos connected: ${hotels} hotels and ${rooms} room categories. Bookings, prices and accounts unchanged.`,
  );
} catch {
  console.error(
    'Photo sync failed. Check Atlas connection and seed records. No credentials printed.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
