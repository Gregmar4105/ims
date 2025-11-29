import React from 'react';
import AppLogoIcon from './app-logo-icon';
import { Instagram } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full mt-25">
      <footer className="border-t border-black bg-white pt-16 pb-8 text-black dark:border-white/10 dark:bg-neutral-950 dark:text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Top Section: Brand & Newsletter */}
          <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-start">
            <div className="max-w-md">
              <div className="flex items-center">
                <AppLogoIcon className="h-12 w-12" /> {/* Adjusted size to standard Tailwind spacing */}
                <h2 className="ml-3 text-2xl font-bold tracking-tight uppercase">LM2 Bicycle Trading</h2>
              </div>
              <p className="mt-4 text-base text-gray-600 dark:text-gray-400">
                Engineered for the ride. Join the community and ride with us.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                Subscribe to our newsletter
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                The latest race news, product drops, and exclusive offers.
              </p>
              <form className="mt-4 sm:flex sm:max-w-md" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  name="email-address"
                  id="email-address"
                  autoComplete="email"
                  required
                  className="w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 dark:focus:border-white dark:focus:ring-white sm:text-sm"
                  placeholder="Enter your email"
                />
                <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus:ring-white dark:focus:ring-offset-neutral-900"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Middle Section: Navigation Links */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Bikes</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Road</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Gravel</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Mountain</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Electric</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Equipment</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Helmets</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Shoes</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Components</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Apparel</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Support</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Bike Registration</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Warranty</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Returns</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Company</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">About Larable</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Innovation</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Stories</a></li>
                <li><a href="#" className="text-base text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">Careers</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section: Socials & Copyright */}
          <div className="mt-16 pt-8 dark:border-white/10">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                &copy; {currentYear} Powered by <a href="https://larable.dev" target="_blank" rel="noreferrer" className="text-amber-600 hover:text-amber-500">Larable™</a> . All rights reserved.
              </p>
              
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                </a>
                <Instagram color="gray" />
                <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </a>
              </div>
            </div>
          </div>
          
        </div>
      </footer>
    </div>
  );
}