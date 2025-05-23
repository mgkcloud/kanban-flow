// More robust environment variable handling for client/server consistency
const getBypassClerk = () => {
  if (typeof window === 'undefined') {
    // Server side
    return process.env.NEXT_PUBLIC_BYPASS_CLERK === 'true'
  } else {
    // Client side - check both the bundled env var and potentially localStorage
    return process.env.NEXT_PUBLIC_BYPASS_CLERK === 'true'
  }
}

export const BYPASS_CLERK = getBypassClerk()
export const DEV_USER_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'will@feistyagency.com'
