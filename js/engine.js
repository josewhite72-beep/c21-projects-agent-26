/**
 * Century 21 Projects Agent - Core Engine v2.3
 * Handles two JSON structures:
 *   - grade_X.json: array of {scenario, themes, ...}
 *   - grade_X_projects.json: {projects_by_scenario: {"Short Title": [...]}}
 * Matches scenario titles using short-title extraction.
 */

const C21Engine = (function() {
    'use strict';

    const dataCache = {
        gradeData: null,      // raw array from grade_X.json
        projectsData: null,   // raw object from grade_X_projects.json
        scenarioList: [],     // normalized [{title, shortTitle, themes, ...}]
        currentGrade: null
    };

    let currentLoadRequest = null;
    let loadingGrade = null;

    function getGradeFileName(grade) {
        if (!grade) return null;
        const gradeMap = {
            'pre_k': 'pre-k',
            'kinder': 'kinder',
            '1': '1', '2': '2', '3': '3',
            '4': '4', '5': '5', '6': '6'
        };
        const suffix = gradeMap[grade];
        if (!suffix) return null;
        return `grade_${suffix}`;
    }

    async function fetchData(fileName) {
        try {
            const response = await fetch(`./${fileName}.json`);
            if (!response.ok) {
                console.warn(`File not found: ${fileName} (${response.status})`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.warn(`Could not load ${fileName}:`, error);
            return null;
        }
    }

    /**
     * Extracts the short title from a scenario string.
     * "Scenario 1: All Week Long!" → "All Week Long!"
     * "All Week Long!" → "All Week Long!"
     */
    function extractShortTitle(scenarioStr) {
        if (!scenarioStr) return '';
        const colonIdx = scenarioStr.indexOf(':');
        if (colonIdx !== -1) {
            return scenarioStr.slice(colonIdx + 1).trim();
        }
        return scenarioStr.trim();
    }

    /**
     * Normalizes gradeData (array) into a consistent scenarioList.
     */
    function buildScenarioList(gradeArray) {
        if (!Array.isArray(gradeArray)) return [];
        return gradeArray.map(item => {
            const fullTitle = item.scenario || '';
            const shortTitle = extractShortTitle(fullTitle);
            return {
                title: shortTitle,          // used for UI display and matching
                fullTitle: fullTitle,
                themes: Array.isArray(item.themes) ? item.themes : [],
                raw: item
            };
        });
    }

    async function loadGrade(grade) {
        const baseFileName = getGradeFileName(grade);
        if (!baseFileName) {
            console.error('Invalid grade:', grade);
            return false;
        }

        if (loadingGrade === grade && currentLoadRequest) {
            return currentLoadRequest;
        }

        dataCache.gradeData = null;
        dataCache.projectsData = null;
        dataCache.scenarioList = [];
        dataCache.currentGrade = null;
        loadingGrade = grade;

        const loadPromise = (async () => {
            const startTime = Date.now();
            console.log(`Loading grade ${grade}...`);

            const [gradeData, projectsData] = await Promise.all([
                fetchData(baseFileName),
                fetchData(`${baseFileName}_projects`)
            ]);

            if (loadingGrade !== grade) {
                console.warn(`Grade changed during load - discarding ${grade}`);
                return false;
            }

            if (!gradeData) {
                console.error('Failed to load grade data:', baseFileName);
                loadingGrade = null;
                currentLoadRequest = null;
                return false;
            }

            const scenarioList = buildScenarioList(gradeData);

            if (!scenarioList.length) {
                console.error('No scenarios found in:', baseFileName);
                loadingGrade = null;
                currentLoadRequest = null;
                return false;
            }

            const elapsed = Date.now() - startTime;
            console.log(`Grade ${grade} loaded: ${scenarioList.length} scenarios in ${elapsed}ms`);

            dataCache.gradeData = gradeData;
            dataCache.projectsData = projectsData || null;
            dataCache.scenarioList = scenarioList;
            dataCache.currentGrade = grade;
            loadingGrade = null;
            currentLoadRequest = null;

            return true;
        })();

        currentLoadRequest = loadPromise;
        return loadPromise;
    }

    function getScenarios() {
        return dataCache.scenarioList || [];
    }

    function getScenarioByTitle(title) {
        return getScenarios().find(s => s.title === title) || null;
    }

    function getThemes(scenarioTitle) {
        const scenario = getScenarioByTitle(scenarioTitle);
        if (!scenario) return [];
        return scenario.themes || [];
    }

    function getProjects(scenarioTitle) {
        // Primary: grade_X_projects.json → projects_by_scenario
        if (dataCache.projectsData && dataCache.projectsData.projects_by_scenario) {
            const byScenario = dataCache.projectsData.projects_by_scenario;
            // Direct match first
            if (Array.isArray(byScenario[scenarioTitle]) && byScenario[scenarioTitle].length > 0) {
                return byScenario[scenarioTitle];
            }
            // Fuzzy match: check if any key contains the scenarioTitle or vice versa
            const key = Object.keys(byScenario).find(k =>
                k.toLowerCase() === scenarioTitle.toLowerCase() ||
                k.toLowerCase().includes(scenarioTitle.toLowerCase()) ||
                scenarioTitle.toLowerCase().includes(k.toLowerCase())
            );
            if (key && Array.isArray(byScenario[key]) && byScenario[key].length > 0) {
                return byScenario[key];
            }
        }
        return [];
    }

    function getProjectById(scenarioTitle, projectId) {
        return getProjects(scenarioTitle).find(p => p.id === projectId) || null;
    }

    function getCurrentGradeData() { return dataCache.gradeData; }
    function getCurrentProjectsData() { return dataCache.projectsData; }

    function getProficiencyLevel() {
        if (dataCache.projectsData && dataCache.projectsData.proficiency_level) {
            return dataCache.projectsData.proficiency_level;
        }
        return null;
    }

    function clearCache() {
        dataCache.gradeData = null;
        dataCache.projectsData = null;
        dataCache.scenarioList = [];
        dataCache.currentGrade = null;
        loadingGrade = null;
        currentLoadRequest = null;
    }

    function isLoading() { return loadingGrade !== null; }
    function getLoadingGrade() { return loadingGrade; }

    return {
        loadGrade,
        getScenarios,
        getScenarioByTitle,
        getThemes,
        getProjects,
        getProjectById,
        getCurrentGradeData,
        getCurrentProjectsData,
        getProficiencyLevel,
        clearCache,
        isLoading,
        getLoadingGrade
    };
})();
