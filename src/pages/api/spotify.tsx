import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
//import querystring from 'querystring';
export const runtime = "edge";
const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  SPOTIFY_REFRESH_TOKEN: refresh_token,
} = process.env;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const QUEUE_ENDPOINT = `https://api.spotify.com/v1/me/player/queue`
const HISTORY_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played?limit=3`
export type Queue = {
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
}

export type SongInfo = {
  title?: string;
  artist?: string;
  isPlaying?: boolean;
  album?: string;
  albumImageUrl?: string;
  duration?: number;
  songUrl?: string;
  progress?: number;
  queue?: Queue;
  history?: Queue;
  preview?: string;
}

const getAccessToken = async () => {
  const params = new URLSearchParams({
    'grant_type': 'refresh_token',
    'refresh_token': refresh_token as string
  }).toString();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    /* new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }),*/
  });

  return response.json();
};

export const getNowPlaying = async () => {
  const { access_token } = await getAccessToken();

  return fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};
export const getQueue = async () => {
  const { access_token } = await getAccessToken();
  return fetch(QUEUE_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  })
}

export const getHistory = async () => {
  const { access_token } = await getAccessToken();
  return fetch(HISTORY_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  })
}
export const putSong = async (song: string) => {
  const { access_token } = await getAccessToken();
  return fetch(QUEUE_ENDPOINT + "?uri="+song, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  })
}
export default async function GET(req: NextApiRequest, res: NextApiResponse<SongInfo>) {
  const response = await getNowPlaying();
  const que = await getQueue();
  const his = await getHistory();
  if (response.status === 204 || response.status > 400) {
    return NextResponse.json({ isPlaying: false }, { status: 200 });
  }
  const song = await response.json();
  const queu = await que.json();
  const histo = await his.json();
  // console.log(histo.items)
  const queue = queu.queue;
  const history = histo.items;
  var item: any = []
  var historyItem: any = []

  await history.forEach(async (q: any) => {
   // console.log(q.track.album.images)
    if(history.length < 1) return;
    historyItem.push({
      album: q.track.album.name,
      title: q.track.name,
      artist: q.track.artists.map((_artist: any) => _artist.name).join(', '),
      albumImageUrl: q.track.album.images[0].url
    })
  })
  await queue.forEach(async (q: any) => {
    if(item.filter((n: any) => n?.title === q?.name).length >= 1) return;
    item.push({
      album: q.album.name,
      title: q.name,
      artist: q.artists.map((_artist: any) => _artist.name).join(', '),
      albumImageUrl: q.album.images[0].url
    })
  })
  // console.log(item)

  const isPlaying = song.is_playing;
  const title = song.item.name;
  const artist = song.item.artists.map((_artist: any) => _artist.name).join(', ');
  const album = song.item.album.name;
  const albumImageUrl = song.item.album.images[0].url;
  const songUrl = song.item.external_urls.spotify;
  const duration = song.item.duration_ms;
  const progress = song.progress_ms
  const preview = song.item.preview_url
  return NextResponse.json({
    album,
    albumImageUrl,
    artist,
    isPlaying,
    songUrl,
    title,
    duration,
    progress,
    preview,
    queue: item,
    history: historyItem
  }, { status: 200 });
};