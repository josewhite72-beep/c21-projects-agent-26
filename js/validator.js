/**
 * Century 21 Projects Agent - Validator
 */

const C21Validator = (function() {
    'use strict';

    function validateSelection() {
        var gradeData = C21Engine.getCurrentGradeData();
        if (!gradeData) return false;

        var scenarioTitle = document.getElementById('scenario') && document.getElementById('scenario').value;
        var theme = document.getElementById('theme') && document.getElementById('theme').value;
        var projectId = document.getElementById('project') && document.getElementById('project').value;

        if (!scenarioTitle) return false;

        var scenario = C21Engine.getScenarioByTitle(scenarioTitle);
        if (!scenario) return false;

        if (theme && scenario.themes && !scenario.themes.includes(theme)) return false;

        if (projectId) {
            var project = C21Engine.getProjectById(scenarioTitle, projectId);
            if (!project) return false;
        }

        return true;
    }

    function isComplete() {
        var grade = document.getElementById('grade') && document.getElementById('grade').value;
        var scenario = document.getElementById('scenario') && document.getElementById('scenario').value;
        return !!(grade && scenario);
    }

    return { validateSelection, isComplete };
})();
