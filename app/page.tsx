import { StoryForm } from "@/components/editor/story-form";

export default function HomePage() {
  return (
    <div>
      <div className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Kids Story Studio</p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] md:text-6xl">StoryMotion AI</h1>
        <p className="mt-4 text-lg text-muted">
          Turn your kids&apos; stories into consistent Gemini and Google Flow video prompts.
        </p>
      </div>
      <StoryForm />
    </div>
  );
}
