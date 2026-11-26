const User = require('../models/User');
const Trail = require('../models/Trail');
const ForumPost = require('../models/ForumPost');

async function seedInitialData() {
  if (process.env.SEED_DEMO_DATA === 'false') {
    return;
  }

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const demoUsers = [
      {
        username: 'admin',
        displayName: 'Trail Admin',
        email: 'admin@trailmate.hk',
        password: process.env.DEMO_ADMIN_PASSWORD || 'password123',
        role: 'admin'
      },
      {
        username: 'hiker1',
        displayName: 'Alex Hiker',
        email: 'hiker1@trailmate.hk',
        password: process.env.DEMO_USER_PASSWORD || 'password123',
        role: 'organizer'
      }
    ];
    for (const u of demoUsers) {
      await User.create(u);
    }
    console.log('Seeded default demo users.');
  }

  const trailCount = await Trail.countDocuments();
  if (trailCount === 0) {
    const sampleTrails = [
      {
        trailName: "Dragon's Back (Shek O Peak)",
        district: 'Hong Kong Island',
        difficulty: 'Easy',
        distanceKm: 8.5,
        durationHrs: 3.5,
        elevationM: 284,
        trailStatus: 'Open',
        meetupDate: '2026-12-05',
        meetingPoint: 'Shau Kei Wan MTR Exit A3 (Bus 9 Terminus)',
        nearestMtr: 'Shau Kei Wan MTR Station (Island Line, Exit A3)',
        busRoutes: 'Citybus Route 9 (towards Shek O) — alight at To Tei Wan stop on Shek O Road (~20 mins)',
        returnTransport: 'Citybus Route 9 from Big Wave Bay / Shek O Road back to Shau Kei Wan MTR',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=To+Tei+Wan+Dragons+Back+Trailhead+Hong+Kong',
        imageUrl: '/images/dragons-back.jpg',
        maxParticipants: 15,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['admin'],
        gearChecklist: ['1.5L Water', 'Sunscreen', 'Cap', 'Trail Shoes'],
        description:
          'Coastal ridge hike along Hong Kong Trail Section 8 overlooking Shek O, Tai Long Wan, and Big Wave Bay.',
        safetyNotes: 'Minimal shade along the ridge; bring sun protection and at least 1.5L of water.',
        createdBy: 'admin'
      },
      {
        trailName: 'Lion Rock Peak',
        district: 'Kowloon',
        difficulty: 'Moderate',
        distanceKm: 6.2,
        durationHrs: 3.0,
        elevationM: 495,
        trailStatus: 'Open',
        meetupDate: '2026-12-06',
        meetingPoint: 'Wong Tai Sin MTR Exit E (Shatin Pass Road)',
        nearestMtr: 'Wong Tai Sin MTR Station (Kwun Tong Line, Exit E) or Lok Fu MTR Station',
        busRoutes: 'Green Minibus 18M from Shatin Pass Road to Fat Chong Temple, or Green Minibus 72 to Lion Rock Park (Chuk Yuen Road)',
        returnTransport: 'Walk down from Lion Rock Park (Chuk Yuen Road) or take Lung Cheung Road buses to Wong Tai Sin / Lok Fu MTR',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lion+Rock+Park+Chuk+Yuen+Road+Hong+Kong',
        imageUrl: '/images/lion-rock.jpg',
        maxParticipants: 12,
        participants: ['hiker1'],
        bookmarkedBy: ['hiker1'],
        gearChecklist: ['2L Water', 'Trekking Poles', 'Windbreaker'],
        description:
          'Kowloon ridge climb along MacLehose Trail Section 5 with wide views across Kowloon Peninsula, Victoria Harbour, and Sha Tin.',
        safetyNotes: 'Steep rocky steps near the summit; watch for loose gravel and strong wind gusts.',
        createdBy: 'hiker1'
      },
      {
        trailName: 'MacLehose Trail Section 2 (Sai Wan to Pak Tam Au)',
        district: 'New Territories',
        difficulty: 'Challenging',
        distanceKm: 13.5,
        durationHrs: 5.5,
        elevationM: 520,
        trailStatus: 'Open',
        meetupDate: '2026-12-12',
        meetingPoint: 'Sai Kung Town (Minibus 29R Stop)',
        nearestMtr: 'Choi Hung / Hang Hau / Diamond Hill MTR (transfer to Sai Kung Town) or Sha Tin MTR',
        busRoutes: 'Minibus 29R from Sai Kung Town to Sai Wan Pavilion (~20 mins); or KMB 94 (Sai Kung) / 96R (Diamond Hill, Sun & PH) / 289R (Sha Tin, Sun & PH) to Pak Tam Au',
        returnTransport: 'KMB 94 (to Sai Kung), 96R (to Diamond Hill MTR, Sun & PH), or 289R (to Sha Tin Central, Sun & PH) from Pak Tam Au',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Sai+Wan+Pavilion+Sai+Kung+Hong+Kong',
        imageUrl: '/images/sai-kung.jpg',
        maxParticipants: 10,
        participants: ['admin'],
        bookmarkedBy: ['admin'],
        gearChecklist: ['2.5L Water', 'Electrolytes', 'Headlamp', 'Snacks'],
        description:
          'Sai Kung coastal route in Hong Kong UNESCO Global Geopark passing Tai Long Sai Wan, Ham Tin Wan beaches, and Chek Keng.',
        safetyNotes: 'Long distance with limited exit points; start before 09:00 AM and check 29R departure times.',
        createdBy: 'admin'
      },
      {
        trailName: 'Sunset Peak (Tai Tung Shan)',
        district: 'Lantau Island',
        difficulty: 'Challenging',
        distanceKm: 9.0,
        durationHrs: 4.5,
        elevationM: 869,
        trailStatus: 'Caution - Weather',
        meetupDate: '2026-12-13',
        meetingPoint: 'Tung Chung MTR Exit B (Bus Terminus)',
        nearestMtr: 'Tung Chung MTR Station (Tung Chung Line, Exit B)',
        busRoutes: 'New Lantao Bus (NLB) 3M, 11, 11A, or 23 from Tung Chung Bus Terminus — alight at Pak Kung Au',
        returnTransport: 'NLB 3M from Nam Shan / Mui Wo Ferry Pier to Tung Chung MTR, or Ferry from Mui Wo Pier to Central',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pak+Kung+Au+Lantau+Island+Hong+Kong',
        imageUrl: '/images/sunset-peak.jpg',
        maxParticipants: 12,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['admin', 'hiker1'],
        gearChecklist: ['2L Water', 'Headlamp', 'Warm Layer', 'Grip Shoes'],
        description:
          'Hong Kong third-highest peak (869m) on Lantau Trail Section 2, known for autumn silvergrass slopes and Lantau Mountain Camp stone cabins.',
        safetyNotes: 'Temperature drops sharply after sunset; bring headlamps and a windproof layer for the descent.',
        createdBy: 'hiker1'
      },
      {
        trailName: 'High Junk Peak (Tiu Yue Yung)',
        district: 'New Territories',
        difficulty: 'Moderate',
        distanceKm: 6.8,
        durationHrs: 3.5,
        elevationM: 344,
        trailStatus: 'Open',
        meetupDate: '2026-12-19',
        meetingPoint: 'Diamond Hill MTR Exit C2 (KMB 91 Stop)',
        nearestMtr: 'Diamond Hill MTR (Exit C2), Po Lam MTR (Exit A2), or Tseung Kwan O MTR (Exit A1)',
        busRoutes: 'KMB 91 (Diamond Hill MTR), Green Minibus 16 (Po Lam MTR), or Green Minibus 103M (Tseung Kwan O MTR) — alight at Ng Fai Tin on Clear Water Bay Road',
        returnTransport: 'Green Minibus 16 from Po Toi O Village to Po Lam MTR (or KMB 91 / GMB 103M from Sheung Sze Wan stop)',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ng+Fai+Tin+High+Junk+Peak+Country+Trail+Hong+Kong',
        imageUrl: '/images/sai-kung.jpg',
        maxParticipants: 14,
        participants: ['hiker1'],
        bookmarkedBy: [],
        gearChecklist: ['2L Water', 'Gloves', 'Sun Hat', 'Grip Shoes'],
        description:
          'Coastal ridge in Clear Water Bay Country Park finishing near Tin Hau Temple and Po Toi O fishing village.',
        safetyNotes: 'Loose gravel and steep climb near the peak; wear non-slip hiking shoes.',
        createdBy: 'admin'
      },
      {
        trailName: 'Lamma Island Family Trail (Yung Shue Wan to Sok Kwu Wan)',
        district: 'Outlying Islands',
        difficulty: 'Easy',
        distanceKm: 5.0,
        durationHrs: 2.0,
        elevationM: 120,
        trailStatus: 'Open',
        meetupDate: '2026-12-20',
        meetingPoint: 'Central Ferry Pier 4 (Yung Shue Wan Berth)',
        nearestMtr: 'Central MTR (Exit A) or Hong Kong MTR (Exit E1) — 8 min walk to Central Pier 4',
        busRoutes: 'HKKF Ferry from Central Pier 4 (Right berth to Yung Shue Wan ~27 mins; Left berth to Sok Kwu Wan ~35 mins)',
        returnTransport: 'HKKF Ferry from Sok Kwu Wan Ferry Pier (or Yung Shue Wan Pier) back to Central Pier 4',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Yung+Shue+Wan+Ferry+Pier+Lamma+Island+Hong+Kong',
        imageUrl: '/images/dragons-back.jpg',
        maxParticipants: 20,
        participants: ['admin', 'hiker1'],
        bookmarkedBy: ['hiker1'],
        gearChecklist: ['1L Water', 'Camera', 'Comfortable Sneakers', 'Sun Hat'],
        description:
          'Paved island trail linking Yung Shue Wan, Hung Shing Yeh Beach, Lamma Lookout Pavilion, and Sok Kwu Wan pier.',
        safetyNotes: 'Check HKKF return ferry schedules before heading out on weekends.',
        createdBy: 'hiker1'
      }
    ];
    await Trail.insertMany(sampleTrails);
    console.log(`Seeded ${sampleTrails.length} Hong Kong trails.`);
  }

  const forumCount = await ForumPost.countDocuments();
  if (forumCount === 0) {
    const samplePosts = [
      {
        title: 'Sunset Peak silvergrass condition update (Late November)',
        category: 'Trail Conditions',
        relatedTrail: 'Sunset Peak (Tai Tung Shan)',
        content:
          'Hiked from Pak Kung Au via NLB Bus 11 this morning. Silvergrass around the stone cabins is still golden. Wind gets strong after 4:30 PM so bring a windbreaker and headlamp.',
        author: 'hiker1',
        authorDisplayName: 'Alex Hiker',
        likes: ['admin', 'hiker1'],
        comments: [
          {
            author: 'admin',
            authorDisplayName: 'Trail Admin',
            text: 'Thanks for sharing! How long was the queue for Bus 3M at Tung Chung?',
            createdAt: new Date('2026-11-24T18:15:00+08:00')
          }
        ],
        createdAt: new Date('2026-11-24T16:30:00+08:00')
      },
      {
        title: 'Looking for 2-3 buddies for MacLehose Sec 2 next Saturday',
        category: 'Hiking Buddies',
        relatedTrail: 'MacLehose Trail Section 2 (Sai Wan to Pak Tam Au)',
        content:
          'Catching the 08:30 AM Minibus 29R from Sai Kung Town to Sai Wan Pavilion and hiking to Pak Tam Au. Moderate pace with a lunch break at Ham Tin Beach.',
        author: 'admin',
        authorDisplayName: 'Trail Admin',
        likes: ['hiker1'],
        comments: [],
        createdAt: new Date('2026-11-25T20:00:00+08:00')
      },
      {
        title: 'Best budget grip shoes for High Junk Peak loose gravel?',
        category: 'Gear & Tips',
        relatedTrail: 'High Junk Peak (Tiu Yue Yung)',
        content:
          'Planning to hike High Junk Peak next month. Looking for trail runners under HK$700 that grip well on dry granite and loose scree.',
        author: 'hiker1',
        authorDisplayName: 'Alex Hiker',
        likes: ['admin'],
        comments: [
          {
            author: 'admin',
            authorDisplayName: 'Trail Admin',
            text: 'Decathlon Evadict MT2 or Merrell Agility Peak on sale both have reliable lugs for dry HK trails.',
            createdAt: new Date('2026-11-22T22:20:00+08:00')
          }
        ],
        createdAt: new Date('2026-11-22T17:40:00+08:00')
      },
      {
        title: 'Reminder: Northeast Monsoon & Hilltop Temperature Drop',
        category: 'Safety Alert',
        relatedTrail: 'General',
        content:
          'Hilltop temperatures on Lantau and Kowloon peaks can feel 5-7°C colder than urban areas this week. Check HKO warnings before departure.',
        author: 'admin',
        authorDisplayName: 'Trail Admin',
        likes: ['admin', 'hiker1'],
        comments: [],
        createdAt: new Date('2026-11-26T12:00:00+08:00')
      }
    ];
    await ForumPost.insertMany(samplePosts);
    console.log(`Seeded ${samplePosts.length} forum discussions.`);
  }
}

module.exports = { seedInitialData };
