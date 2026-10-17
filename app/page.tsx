import { FeedView } from "@/app/_components/feed-view";
import { posts, room, sessionUser } from "@/app/_data/feed";

export default function Home() {
  return <FeedView user={sessionUser} room={room} initialPosts={posts} />;
}
