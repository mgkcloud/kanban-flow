import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth) => {
  const authObj = await auth();
  if (!authObj.userId) {
    return authObj.redirectToSignIn();
  }
  // If authenticated, continue
});

export const config = {
  matcher: ['/api/(.*)'],
}; 