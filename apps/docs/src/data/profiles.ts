import { fetchJson } from "./http";

/** Normalized person used by the Profiles example cards. */
export interface Profile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  email: string;
}

interface RandomUserResponse {
  results: Array<{
    login: { uuid: string };
    name: { first: string; last: string };
    picture: { large: string };
    location: { city: string; country: string };
    email: string;
  }>;
}

// A fixed `seed` keeps builds deterministic — same six people every time.
const ENDPOINT =
  "https://randomuser.me/api/?results=6&inc=name,picture,location,email,login&seed=deltached&noinfo";

/** Source: randomuser.me — free, no key. */
export async function getProfiles(): Promise<Profile[]> {
  const data = await fetchJson<RandomUserResponse>(ENDPOINT);

  return data.results.map((user) => ({
    id: user.login.uuid,
    name: `${user.name.first} ${user.name.last}`,
    avatar: user.picture.large,
    location: `${user.location.city}, ${user.location.country}`,
    email: user.email,
  }));
}
