import bcrypt from 'bcryptjs';
import { Hotel, Room, User } from './models.js';
export const hotelNames = [
  'Zambezi Crest Hotel',
  'Mosi River Lodge',
  'Baobab View Resort',
  'Falls Edge Boutique Hotel',
  'Rainforest Haven',
  'Sunset Gorge Retreat',
];
export async function seedData() {
  const password = await bcrypt.hash('ReserveDemo123!', 12);
  for (const [email, name, role] of [
    ['admin@vfr.example', 'Reserve Administrator', 'Admin'],
    ['customer@vfr.example', 'Alex Traveller', 'Customer'],
  ])
    await User.updateOne(
      { email },
      { $setOnInsert: { email, name, role, password } },
      { upsert: true },
    );
  for (const [i, name] of hotelNames.entries()) {
    let hotel = await Hotel.findOne({ name });
    if (!hotel)
      hotel = await Hotel.create({
        name,
        description: [
          'A quiet riverside retreat overlooking the Zambezi, with generous terraces and thoughtful Zimbabwean hospitality.',
          'Wake to birdsong and the rhythm of the river. Intimate suites blend natural materials with relaxed, considered comfort.',
          'Gather beneath ancient baobabs, unwind by the pool, and explore one of the world’s most remarkable landscapes.',
          'A small, beautifully considered hideaway close to the Falls, with private gardens and a warm welcome.',
          'A peaceful sanctuary framed by lush foliage and the distant sound of the Falls. Slow mornings come naturally here.',
          'Watch the light change across the gorge from your private terrace. A secluded escape for memorable evenings.',
        ][i],
        location: [
          'Zambezi riverfront',
          'Upper Zambezi',
          'Victoria Falls gardens',
          'Falls town centre',
          'Rainforest district',
          'Batoka gorge',
        ][i],
        image: `/images/hotels/hotel-${i + 1}.svg`,
        amenities: ['Wi-Fi', 'Breakfast', 'Pool', ...(i % 2 === 0 ? ['Spa'] : ['River views'])],
        featured: i < 3,
      });
    for (const [j, roomName] of ['Garden King', 'River View Suite', 'Family Retreat'].entries())
      await Room.updateOne(
        { hotel: hotel._id, name: roomName },
        {
          $setOnInsert: {
            hotel: hotel._id,
            name: roomName,
            description: [
              'A restful king room with a private garden patio.',
              'A spacious suite with a lounge and views of the river.',
              'Room to reconnect, with two bedrooms and a shared terrace.',
            ][j],
            image: `/images/rooms/room-${j + 1}.svg`,
            capacity: j === 2 ? 4 : 2,
            price: 120 + i * 25 + j * 65,
            units: 3,
          },
        },
        { upsert: true },
      );
  }
}
