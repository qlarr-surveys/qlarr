import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

/**
 * i18n Namespace constants
 *
 * See /public/locales/README.md for full documentation.
 *
 * Quick reference:
 * - MANAGE: Dashboard, auth, survey management pages
 * - RUN: Respondent-facing survey runtime
 * - DESIGN_CORE: Main survey designer UI (design/core.json, includes logic_builder.*)
 * - DESIGN_EDITOR: TipTap rich text editor (design/editor.json)
 * - DESIGN_TOOLTIPS: Help tooltips (design/tooltips.json)
 */
export const NAMESPACES = {
  MANAGE: 'manage',
  RUN: 'run',
  DESIGN_CORE: 'design/core',
  DESIGN_TOOLTIPS: 'design/tooltips',
  DESIGN_EDITOR: 'design/editor',
};

/**
 * Hook to load i18n namespaces based on the current route.
 * This enables lazy loading of translations for better performance.
 *
 * Usage: Call this hook in route wrapper components or layout components.
 */
export function useNamespaceLoader() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const loadedNamespaces = useRef(new Set());

  useEffect(() => {
    const path = location.pathname;
    const namespacesToLoad = [];

    // Design routes need all design namespaces
    if (path.includes('design-survey') || path.includes('edit-survey')) {
      namespacesToLoad.push(
        NAMESPACES.DESIGN_CORE,
        NAMESPACES.DESIGN_EDITOR,
        NAMESPACES.DESIGN_TOOLTIPS,
        NAMESPACES.RUN
      );
    }

    // Run routes need run namespace (preview iframe handles its own translations)
    if (path.includes('run-survey')) {
      namespacesToLoad.push(NAMESPACES.RUN);
    }

    // Responses page may need some design namespaces for displaying question types
    if (path.includes('responses')) {
      namespacesToLoad.push(NAMESPACES.DESIGN_CORE);
    }

    // Filter out already loaded namespaces
    const newNamespaces = namespacesToLoad.filter(
      (ns) => !loadedNamespaces.current.has(ns) && !i18n.hasLoadedNamespace(ns)
    );

    if (newNamespaces.length > 0) {
      i18n.loadNamespaces(newNamespaces).then(() => {
        newNamespaces.forEach((ns) => loadedNamespaces.current.add(ns));
      });
    }
  }, [location.pathname, i18n]);
}

/**
 * Load design tooltips namespace on demand.
 * Call this when tooltip functionality is needed.
 *
 * @param {object} i18n - The i18n instance
 */
export function loadTooltipsNamespace(i18n) {
  if (!i18n.hasLoadedNamespace(NAMESPACES.DESIGN_TOOLTIPS)) {
    return i18n.loadNamespaces(NAMESPACES.DESIGN_TOOLTIPS);
  }
  return Promise.resolve();
}

export default useNamespaceLoader;
