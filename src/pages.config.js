/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const Clients = lazy(() => import('./pages/Clients'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Policies = lazy(() => import('./pages/Policies'));
const Reports = lazy(() => import('./pages/Reports'));
const Tasks = lazy(() => import('./pages/Tasks'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Renewals = lazy(() => import('./pages/Renewals'));
const ROA = lazy(() => import('./pages/ROA'));


export const PAGES = {
    "AuditLogs": AuditLogs,
    "ClientProfile": ClientProfile,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Pipeline": Pipeline,
    "Policies": Policies,
    "Reports": Reports,
    "Tasks": Tasks,
    "UserManagement": UserManagement,
    "Renewals": Renewals,
    "ROA": ROA,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};