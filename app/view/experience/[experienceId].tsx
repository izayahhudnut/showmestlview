// app/view/experience/[experienceId].tsx
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // Keep Timestamp import
import { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// --- Interfaces remain the same ---
interface PlaceDetail {
  id?: string;
  name: string;
  image?: string | null;
  address?: string | null;
  category?: string | null;
  rating?: number | string | null;
}

interface ExperienceStep {
  id: string;
  category: { id: string; label: string };
  places: PlaceDetail[];
  locked?: boolean;
  currentIndex?: number;
}

interface ExperienceFirestoreData {
  title: string;
  description?: string | null;
  author?: string | null;
  coverImage?: string | null;
  image?: string | null;
  steps?: ExperienceStep[];
  placeDetails?: PlaceDetail[];
  createdAt?: Timestamp; // Expect Timestamp from Firestore
  updatedAt?: Timestamp; // Expect Timestamp from Firestore
}

interface ExperienceData extends Omit<ExperienceFirestoreData, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt?: string | null; // Expect string OR null/undefined in the final component data
  updatedAt?: string | null; // Expect string OR null/undefined in the final component data
}

// --- REMOVED makeSerializable function ---

// --- MODIFIED Data Fetching Function ---
async function getExperience(id: string): Promise<ExperienceData | null> {
  if (!id) {
    console.error('getExperience called with no ID');
    return null;
  }

  try {
    console.log(`Fetching experience with ID: ${id}`);
    const docRef = doc(db, 'playlists', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log(`Document found for ID: ${id}`);
      // Get raw data and assert its potential Firestore structure
      const rawData = docSnap.data() as ExperienceFirestoreData;

      // --- Explicitly process Timestamps ---
      let processedCreatedAt: string | null = null;
      if (rawData.createdAt && rawData.createdAt instanceof Timestamp) {
        try {
          processedCreatedAt = rawData.createdAt.toDate().toISOString();
        } catch (e) {
          console.error("Error converting createdAt timestamp:", e);
        }
      }

      let processedUpdatedAt: string | null = null;
      if (rawData.updatedAt && rawData.updatedAt instanceof Timestamp) {
         try {
            processedUpdatedAt = rawData.updatedAt.toDate().toISOString();
         } catch (e) {
           console.error("Error converting updatedAt timestamp:", e);
         }
      }
      // Add similar blocks here if you have other Timestamp fields

      // --- Construct the final object conforming to ExperienceData ---
      const experienceData: ExperienceData = {
        id: docSnap.id,
        title: rawData.title ?? 'Untitled Experience',
        description: rawData.description,
        author: rawData.author,
        coverImage: rawData.coverImage,
        image: rawData.image,
        // Ensure nested data doesn't contain Timestamps if not handled
        // If steps/placeDetails *can* contain Timestamps, they need processing too!
        steps: rawData.steps,
        placeDetails: rawData.placeDetails,
        // Assign the processed string/null values
        createdAt: processedCreatedAt,
        updatedAt: processedUpdatedAt,
      };

      // This object 'experienceData' should now strictly match the ExperienceData interface
      return experienceData;

    } else {
      console.log(`No document found for ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching experience ID ${id}:`, error);
    return null;
  }
}

// --- Metadata Function remains the same ---
type Props = {
  params: { experienceId: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // ... (metadata logic as before - it uses getExperience which now returns correct type)
  const id = params.experienceId;
  if (!id) {
    return { title: 'Invalid Request' };
  }
  const experience = await getExperience(id); // Should get correctly typed data now

  if (!experience) {
    return {
      title: 'Experience Not Found',
      description: 'The requested experience could not be found.',
    };
  }

  const displayTitle = experience.title || 'Shared Experience';
  const displayDescription = experience.description || `Check out this experience curated by ${experience.author || 'a user'}.`;
  const imageUrl = experience.coverImage || experience.image || '/default-og-image.png';
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/view/experience/${id}`;

  return {
    title: displayTitle,
    description: displayDescription,
    openGraph: {
      title: displayTitle,
      description: displayDescription,
      images: imageUrl ? [
        {
          url: imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${imageUrl}`,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ] : undefined,
      url: pageUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: displayTitle,
      description: displayDescription,
      images: imageUrl ? [imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_BASE_URL || ''}${imageUrl}`] : undefined,
    },
  };
}


// --- Page Component remains the same ---
export default async function ExperiencePage({ params }: Props) {
  // ... (component logic as before - it uses getExperience which now returns correct type)
  const experience = await getExperience(params.experienceId);

  if (!experience) {
    notFound();
  }

  const displayImage = experience.coverImage || experience.image || '/placeholder.avif';

  const placesToShow: PlaceDetail[] = [];
  if (Array.isArray(experience.steps)) {
      experience.steps.forEach(step => {
          if (step && Array.isArray(step.places) && step.places.length > 0 && step.places[0]) {
              placesToShow.push(step.places[0]);
          }
      });
  } else if (Array.isArray(experience.placeDetails)) {
      experience.placeDetails.forEach(place => {
          if (place && place.name) {
             placesToShow.push(place);
          }
      });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">

        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-lg mb-6 md:mb-8">
          <Image
            src={displayImage}
            alt={experience.title ? `${experience.title} cover image` : 'Experience cover image'}
            fill
            style={{ objectFit: 'cover' }}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
             onError={(e) => {
                console.warn(`Failed to load image: ${displayImage}`);
                (e.target as HTMLImageElement).style.display = 'none';
             }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none"></div>
        </div>

        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 break-words">
            {experience.title || 'Untitled Experience'}
          </h1>
          {experience.author && (
            <p className="text-base sm:text-lg text-gray-400 italic">
              Curated by {experience.author}
            </p>
          )}
        </div>

        {experience.description && (
          <div className="bg-gray-800 bg-opacity-60 rounded-lg p-4 md:p-6 mb-6 md:mb-8 shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-100">About this Experience</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {experience.description}
            </p>
          </div>
        )}

        {placesToShow.length > 0 ? (
            <div className="mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center md:text-left text-gray-100">Itinerary</h2>
              <div className="space-y-4 md:space-y-6">
                {placesToShow.map((place, index) => (
                  <div
                    key={place.id || `place-${index}`}
                    className="flex flex-col md:flex-row bg-gray-800 rounded-lg shadow-md overflow-hidden transition duration-300 ease-in-out hover:shadow-xl hover:bg-gray-700"
                  >
                    {place.image && (
                      <div className="w-full md:w-48 lg:w-64 h-48 md:h-auto relative flex-shrink-0">
                        <Image
                          src={place.image}
                          alt={place.name ? `Image of ${place.name}` : 'Place image'}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                           onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                        />
                      </div>
                    )}
                    <div className="p-4 md:p-5 flex flex-col justify-center flex-grow">
                        {place.category && (
                           <p className="text-xs sm:text-sm text-blue-400 uppercase tracking-wider mb-1 font-medium">
                             {place.category}
                           </p>
                        )}
                        <h3 className="text-xl sm:text-2xl font-semibold mb-1 text-white">
                          {place.name || 'Unnamed Place'}
                        </h3>
                        {place.address && (
                          <p className="text-sm sm:text-base text-gray-400 mb-2">
                             {place.address}
                          </p>
                        )}
                       <div className="flex items-center justify-between mt-auto pt-2">
                         <div>
                            {place.rating && (
                                <p className="text-yellow-400 font-bold text-sm sm:text-base">★ {place.rating}</p>
                            )}
                         </div>
                         {place.address && (
                             <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                aria-label={`View ${place.name} on map`}
                             >
                                View on Map →
                             </a>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 py-8">
                No itinerary details available for this experience.
            </div>
        )}

         <div className="text-center mt-10 md:mt-16 p-6 bg-gray-800 rounded-lg shadow-inner">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-100">Want to create your own experiences?</h3>
              <p className="text-gray-400 mb-4">Download the [Your App Name] app!</p>
              <div className="flex justify-center space-x-4">
                  {/* <Link href="/app-store-link" className="text-blue-400 hover:underline">App Store</Link>
                  <Link href="/google-play-link" className="text-blue-400 hover:underline">Google Play</Link> */}
              </div>
          </div>

      </div>
    </div>
  );
}