/** Normalized person available to profile examples. */
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  email: string;
}

const PROFILES: Profile[] = [
  {
    id: "maya-chen",
    name: "Maya Chen",
    avatar: "https://i.pravatar.cc/400?img=47",
    location: "Vancouver, Canada",
    email: "maya@example.com",
  },
  {
    id: "theo-martin",
    name: "Theo Martin",
    avatar: "https://i.pravatar.cc/400?img=12",
    location: "Lyon, France",
    email: "theo@example.com",
  },
  {
    id: "ines-santos",
    name: "Ines Santos",
    avatar: "https://i.pravatar.cc/400?img=32",
    location: "Porto, Portugal",
    email: "ines@example.com",
  },
  {
    id: "noah-wilson",
    name: "Noah Wilson",
    avatar: "https://i.pravatar.cc/400?img=11",
    location: "Auckland, New Zealand",
    email: "noah@example.com",
  },
  {
    id: "amara-okafor",
    name: "Amara Okafor",
    avatar: "https://i.pravatar.cc/400?img=45",
    location: "Lagos, Nigeria",
    email: "amara@example.com",
  },
  {
    id: "lucas-silva",
    name: "Lucas Silva",
    avatar: "https://i.pravatar.cc/400?img=68",
    location: "Curitiba, Brazil",
    email: "lucas@example.com",
  },
];

export async function getProfiles(): Promise<Profile[]> {
  return PROFILES;
}
