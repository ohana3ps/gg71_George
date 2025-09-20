
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Protected routes that require authentication
const protectedRoutes = [
  '/rooms',
  '/items',
  '/analytics',
  '/recipe-generator',
  '/receipt-scanner',
  '/expiration-dashboard',
  '/gallery',
  '/export',
  '/insurance-report',
  '/admin'
];

// Admin-only routes
const adminRoutes = [
  '/admin',
  '/admin/users',
  '/admin/system',
  '/admin/settings'
];

// API routes that need authentication
const protectedApiRoutes = [
  '/api/rooms',
  '/api/items',
  '/api/analytics',
  '/api/users',
  '/api/generate-recipe',
  '/api/process-receipt',
  '/api/racks',
  '/api/boxes',
  '/api/scanning',
  '/api/enhance-items',
  '/api/expiration-alerts',
  '/api/export',
  '/api/food-inventory',
  '/api/recipes',
  '/api/search',
  '/api/change-password'
];

// Admin-only API routes
const adminApiRoutes = [
  '/api/admin',
  '/api/users/manage',
  '/api/system'
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    let token = req.nextauth.token;

    // In test mode, be more permissive
    if (process.env.__NEXT_TEST_MODE === '1') {
      // Set test user headers without JWT verification to avoid Edge Runtime issues
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', 'test-user');
      requestHeaders.set('x-user-role', 'user');
      requestHeaders.set('x-user-admin', 'false');
      requestHeaders.set('x-user-email', 'test@example.com');
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Skip middleware for public routes
    if (pathname === '/' || 
        pathname.startsWith('/auth/') || 
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/auth/') ||
        pathname === '/api/signup' ||
        pathname.startsWith('/app-icon') ||
        pathname === '/favicon.ico') {
      return NextResponse.next();
    }

    // Check if user is authenticated for protected routes
    const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
    const isProtectedPage = protectedRoutes.some(route => pathname.startsWith(route));
    
    if (!token && (isProtectedApi || isProtectedPage)) {
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Redirect to sign in for protected pages
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check admin routes (only if user is authenticated)
    if (token) {
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route)) ||
                          adminApiRoutes.some(route => pathname.startsWith(route));

      if (isAdminRoute) {
        const userRole = (token.role as string) || 'user';
        const isAdmin = token.isAdmin || false;
      
        // Check if user has admin access
        if (!isAdmin && !['admin', 'super_admin'].includes(userRole)) {
          if (pathname.startsWith('/api/')) {
            return new NextResponse(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // Redirect non-admins to home page
          return NextResponse.redirect(new URL('/', req.url));
        }
      }

      // Add user info to request headers for API routes
      if (pathname.startsWith('/api/')) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', (token.id as string) || (token.sub as string) || '');
        requestHeaders.set('x-user-role', (token.role as string) || 'user');
        requestHeaders.set('x-user-admin', token.isAdmin ? 'true' : 'false');
        requestHeaders.set('x-user-email', (token.email as string) || '');
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // In test mode, allow all routes
        if (process.env.__NEXT_TEST_MODE === '1') {
          return true;
        }
        
        // Public routes always allowed
        if (pathname === '/' || 
            pathname.startsWith('/auth/') ||
            pathname === '/api/signup' ||
            pathname.startsWith('/_next/') ||
            pathname.startsWith('/api/auth/') ||
            pathname.startsWith('/app-icon') ||
            pathname === '/favicon.ico') {
          return true;
        }
        
        // For protected API routes, require authentication
        const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
        if (isProtectedApi) {
          return !!token;
        }
        
        // For protected pages, require authentication
        const isProtectedPage = protectedRoutes.some(route => pathname.startsWith(route));
        if (isProtectedPage) {
          return !!token;
        }
        
        // Allow all other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
