import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <div className="text-6xl">🏀</div>
      <h1 className="mt-4 text-3xl font-extrabold">Air ball!</h1>
      <p className="mt-2 text-ink-500">We couldn&apos;t find that page — or you don&apos;t have access to it.</p>
      <Link href="/drills" className="btn-primary mt-6">Back to the drills</Link>
    </div>
  );
}
