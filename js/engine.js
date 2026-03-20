/**
 * Century 21 Projects Agent - Core Engine v2.1
 * Compatible with both legacy (projects_by_scenario) and new (scenarios array) structures
 */

const C21Engine = (function() {
  'use strict';

  const dataCache = {
    gradeData: null,
    projectsData: null,
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

  async function fetchData(fileName, signal) {
    try {
      const response = await fetch(`data/${fileName}.json`, { signal });
      if (!response.ok) {
        console.warn(`File not found: ${fileName} (${response.status})`);
        return null;
      }
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Fetch aborted for ${fileName}`);
        return null;
      }
      console.warn(`Could not load ${fileName}:`, error);
      return null;
    }
  }

  // Adaptador: estructura legacy (projects_by_scenario) → nueva (scenarios array)
  function normalizeGradeData(rawData) {
    if (!rawData) return null;

    // Si ya tiene la estructura correcta, retornar tal cual
    if (Array.isArray(rawData.scenarios)) {
      return rawData;
    }

    // Adaptar estructura legacy: projects_by_scenario → scenarios array
    if (rawData.projects_by_scenario && typeof rawData.projects_by_scenario === 'object') {
      const scenarios = [];
      for (const [title, projects] of Object.entries(rawData.projects_by_scenario)) {
        scenarios.push({
          title: title,
          themes: [],
          global_objective: rawData.global_objective || '',
          communicative_focus: rawData.communicative_focus || '',
          projects: Array.isArray(projects) ? projects : []
        });
      }
      return {
        ...rawData,
        scenarios: scenarios
      };
    }

    console.warn('Unrecognized data structure');
    return rawData;
  }

  async function loadGrade(grade) {
    const baseFileName = getGradeFileName(grade);
    if (!baseFileName) {
      console.error('Invalid grade:', grade);
      return false;
    }

    if (loadingGrade === grade && currentLoadRequest) {
      console.log('Already loading grade', grade, '- reusing request');
      return currentLoadRequest;
    }

    if (currentLoadRequest && loadingGrade !== grade) {
      console.log('Previous load request will be ignored');
    }

    dataCache.gradeData = null;
    dataCache.projectsData = null;
    dataCache.currentGrade = null;
    loadingGrade = grade;

    const loadPromise = (async () => {
      const startTime = Date.now();
      console.log(`Loading grade ${grade}...`);

      const [gradeDataRaw, projectsData] = await Promise.all([
        fetchData(baseFileName),
        fetchData(`${baseFileName}_official_projects`)
      ]);

      if (loadingGrade !== grade) {
        console.warn(`Grade changed during load - discarding ${grade} data`);
        return false;
      }

      if (!gradeDataRaw) {
        console.error('Failed to load grade data for:', baseFileName);
        loadingGrade = null;
        currentLoadRequest = null;
        return false;
      }

      // Normalizar estructura aquí
      const gradeData = normalizeGradeData(gradeDataRaw);

      if (!gradeData.scenarios || !Array.isArray(gradeData.scenarios)) {
        console.error('Invalid scenarios structure after normalization:', baseFileName);
        loadingGrade = null;
        currentLoadRequest = null;
        return false;
      }

      const elapsed = Date.now() - startTime;
      console.log(`Grade ${grade} loaded and normalized in ${elapsed}ms`);

      dataCache.gradeData = gradeData;
      dataCache.projectsData = projectsData || null;
      dataCache.currentGrade = grade;
      loadingGrade = null;
      currentLoadRequest = null;

      return true;
    })();

    currentLoadRequest = loadPromise;
    return loadPromise;
  }

  function getScenarios() {
    if (!dataCache.gradeData || !dataCache.gradeData.scenarios) return [];
    return dataCache.gradeData.scenarios;
  }

  function getScenarioByTitle(title) {
    return getScenarios().find(s => s.title === title) || null;
  }

  function getThemes(scenarioTitle) {
    const scenario = getScenarioByTitle(scenarioTitle);
    if (!scenario || !scenario.themes) return [];
    return Array.isArray(scenario.themes) ? scenario.themes : [];
  }

  function getProjects(scenarioTitle) {
    // Prioridad 1: projects externos (official_projects.json)
    if (dataCache.projectsData?.projects_by_scenario?.[scenarioTitle]) {
      const external = dataCache.projectsData.projects_by_scenario[scenarioTitle];
      if (Array.isArray(external) && external.length > 0) return external;
    }
    // Prioridad 2: proyectos embebidos en el escenario
    const scenario = getScenarioByTitle(scenarioTitle);
    if (scenario?.projects && Array.isArray(scenario.projects)) {
      return scenario.projects;
    }
    return [];
  }

  function getProjectById(scenarioTitle, projectId) {
    return getProjects(scenarioTitle).find(p => p.id === projectId) || null;
  }

  function getCurrentGradeData() { return dataCache.gradeData; }
  function getCurrentProjectsData() { return dataCache.projectsData; }

  function getProficiencyLevel() {
    return dataCache.gradeData?.proficiency_level ||
           dataCache.projectsData?.proficiency_level ||
           null;
  }

  function clearCache() {
    dataCache.gradeData = null;
    dataCache.projectsData = null;
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
