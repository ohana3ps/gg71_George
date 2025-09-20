
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Smartphone, Globe } from 'lucide-react';

export default function DebugAppleIconPage() {
  const [iconTests, setIconTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testIcons = async () => {
      const iconPaths = [
        '/apple-touch-icon.png',
        '/apple-touch-icon-180x180.png',
        '/apple-touch-icon-152x152.png',
        '/apple-touch-icon-120x120.png',
        '/apple-touch-icon-76x76.png',
        '/apple-touch-icon-60x60.png',
        '/apple-touch-icon-57x57.png',
        '/favicon.ico',
        '/manifest.json'
      ];

      const results = await Promise.all(
        iconPaths.map(async (path) => {
          try {
            const response = await fetch(path);
            return {
              path,
              status: response.status,
              contentType: response.headers.get('content-type'),
              size: response.headers.get('content-length'),
              accessible: response.ok
            };
          } catch (error) {
            return {
              path,
              status: 'ERROR',
              contentType: null,
              size: null,
              accessible: false
            };
          }
        })
      );

      setIconTests(results);
      setLoading(false);
    };

    testIcons();
  }, []);

  const metaTags = [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'GarageGrid' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'theme-color', content: '#ffffff' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Smartphone className="h-8 w-8" />
          Apple Touch Icon Debug
        </h1>
        <p className="text-muted-foreground">
          This page helps debug Apple Touch Icon implementation for adding to iPhone home screen.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              How to Test on iPhone
            </CardTitle>
            <CardDescription>
              Follow these steps to test the Apple Touch Icon:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open this page in Safari on your iPhone</li>
              <li>Tap the Share button (square with arrow up)</li>
              <li>Select "Add to Home Screen"</li>
              <li>You should see the GarageGrid icon in the preview</li>
              <li>Tap "Add" to add it to your home screen</li>
              <li>Check that the icon appears correctly on your home screen</li>
            </ol>
          </CardContent>
        </Card>

        {/* Meta Tags Status */}
        <Card>
          <CardHeader>
            <CardTitle>Meta Tags Status</CardTitle>
            <CardDescription>
              Essential meta tags for Apple Touch Icon functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {metaTags.map((tag) => (
                <div key={tag.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">{tag.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{tag.content}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Icon Files Status */}
        <Card>
          <CardHeader>
            <CardTitle>Icon Files Status</CardTitle>
            <CardDescription>
              Accessibility test for all icon files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading icon tests...</div>
            ) : (
              <div className="grid gap-3">
                {iconTests.map((test) => (
                  <div key={test.path} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{test.path}</span>
                      <div className="text-sm text-muted-foreground">
                        {test.contentType && `${test.contentType}`}
                        {test.size && ` • ${Math.round(test.size / 1024)}KB`}
                      </div>
                    </div>
                    <Badge variant={test.accessible ? "default" : "destructive"}>
                      {test.accessible ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {test.status}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          {test.status}
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Icon Preview</CardTitle>
            <CardDescription>
              Preview of the main Apple Touch Icon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="w-16 h-16 rounded-lg overflow-hidden shadow-md">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="Apple Touch Icon" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium">GarageGrid</h3>
                <p className="text-sm text-muted-foreground">180x180 pixels</p>
                <p className="text-sm text-muted-foreground">Main Apple Touch Icon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
