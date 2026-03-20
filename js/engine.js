/**
 * Century 21 Projects Agent - Core Engine v3.1
 * Files are in: data/grade_X.json and data/grade_X_projects.json
 * Handles FORMAT A: {scenarios:[]} and FORMAT B: [{scenario:"...",themes:[]}]
 */

const C21Engine = (function () {
    'use strict';

    const cache = {
        gradeData: null,
        projectsData: null,
        scenarioList: [],
        currentGrade: null
    };

    let loadingGrade = null;
    let currentLoadPromise = null;

    function gradeFileName(grade) {
        const map = {
            pre_k: 'pre-k', kinder: 'kinder',
            '1': '1', '2': '2', '3': '3',
            '4': '4', '5': '5', '6': '6'
        };
        var s = map[grade];
        return s ? 'grade_' + s : null;
    }

    async function fetchJSON(path) {
        try {
            var r = await fetch(path);
            if (!r.ok) { console.warn('Not found:', path); return null; }
            return await r.json();
        } catch (e) {
            console.warn('fetchJSON error:', path, e);
            return null;
        }
    }

    function shortTitle(str) {
        if (!str) return '';
        var i = str.indexOf(':');
        return i !== -1 ? str.slice(i + 1).trim() : str.trim();
    }

    function buildScenarioList(gradeData) {
        if (!gradeData) return [];
        // FORMAT A: object with .scenarios array
        if (!Array.isArray(gradeData) && Array.isArray(gradeData.scenarios)) {
            return gradeData.scenarios.map(function(s) {
                return { title: s.title || '', themes: Array.isArray(s.themes) ? s.themes : [], raw: s };
            });
        }
        // FORMAT B: plain array [{scenario: "Scenario N: Title", themes:[]}]
        if (Array.isArray(gradeData)) {
            return gradeData.map(function(item) {
                return { title: shortTitle(item.scenario || ''), themes: Array.isArray(item.themes) ? item.themes : [], raw: item };
            });
        }
        return [];
    }

    function findProjects(scenarioTitle) {
        var byScenario = cache.projectsData && cache.projectsData.projects_by_scenario;
        if (!byScenario) return [];
        // Exact match
        if (Array.isArray(byScenario[scenarioTitle])) return byScenario[scenarioTitle];
        // Case-insensitive
        var needle = scenarioTitle.toLowerCase();
        var keys = Object.keys(byScenario);
        var found = keys.find(function(k){ return k.toLowerCase() === needle; });
        if (found) return byScenario[found];
        // Partial match
        found = keys.find(function(k){
            return k.toLowerCase().includes(needle) || needle.includes(k.toLowerCase());
        });
        return found ? byScenario[found] : [];
    }

    async function loadGrade(grade) {
        var base = gradeFileName(grade);
        if (!base) { console.error('Invalid grade:', grade); return false; }
        if (loadingGrade === grade && currentLoadPromise) return currentLoadPromise;

        cache.gradeData = null;
        cache.projectsData = null;
        cache.scenarioList = [];
        cache.currentGrade = null;
        loadingGrade = grade;

        currentLoadPromise = (async function() {
            var t0 = Date.now();
            var results = await Promise.all([
                fetchJSON('data/' + base + '.json'),
                fetchJSON('data/' + base + '_projects.json')
            ]);
            var gradeData = results[0];
            var projectsData = results[1];

            if (loadingGrade !== grade) return false;
            if (!gradeData) {
                console.error('Could not load:', base);
                loadingGrade = null; currentLoadPromise = null;
                return false;
            }
            var scenarioList = buildScenarioList(gradeData);
            if (!scenarioList.length) {
                console.error('No scenarios in:', base);
                loadingGrade = null; currentLoadPromise = null;
                return false;
            }
            cache.gradeData = gradeData;
            cache.projectsData = projectsData || null;
            cache.scenarioList = scenarioList;
            cache.currentGrade = grade;
            loadingGrade = null; currentLoadPromise = null;
            console.log('Grade ' + grade + ': ' + scenarioList.length + ' scenarios, ' +
                (projectsData ? 'projects OK' : 'NO projects file') + ' (' + (Date.now()-t0) + 'ms)');
            return true;
        })();

        return currentLoadPromise;
    }

    function getScenarios()            { return cache.scenarioList; }
    function getScenarioByTitle(title) { return cache.scenarioList.find(function(s){ return s.title === title; }) || null; }
    function getThemes(title)          { var s = getScenarioByTitle(title); return s ? s.themes : []; }
    function getProjects(title)        { return findProjects(title); }
    function getProjectById(title, id) { return findProjects(title).find(function(p){ return p.id === id; }) || null; }
    function getCurrentGradeData()     { return cache.gradeData; }
    function getCurrentProjectsData()  { return cache.projectsData; }
    function getProficiencyLevel() {
        if (cache.projectsData && cache.projectsData.proficiency_level) return cache.projectsData.proficiency_level;
        if (!Array.isArray(cache.gradeData) && cache.gradeData && cache.gradeData.proficiency_level) return cache.gradeData.proficiency_level;
        return null;
    }
    function clearCache() {
        cache.gradeData = cache.projectsData = null;
        cache.scenarioList = []; cache.currentGrade = null;
        loadingGrade = null; currentLoadPromise = null;
    }
    function isLoading()       { return loadingGrade !== null; }
    function getLoadingGrade() { return loadingGrade; }

    return {
        loadGrade, getScenarios, getScenarioByTitle, getThemes,
        getProjects, getProjectById, getCurrentGradeData,
        getCurrentProjectsData, getProficiencyLevel,
        clearCache, isLoading, getLoadingGrade
    };
})();
