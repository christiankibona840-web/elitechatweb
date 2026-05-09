import { useEffect, useState } from "react";

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* The fix is below: 
          'duration-[1500ms]' changed to 'duration-[transition-duration:1500ms]' 
      */}
      <div 
        className={`transition-all duration-[transition-duration:1500ms] ease-in-out transform ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 text-center">
          YST Web Chat
        </h1>
        <p className="text-muted-foreground text-lg text-center max-w-md">
          A modern, secure messaging platform for teams and communities.
        </p>
      </div>
    </div>
  );
};

export default Index;
