/**
 * Century 21 Projects Agent - Exporter v3.1
 * Fixed: Safe property access and fallback values
 */

function exportWord() {
  const docxLib = window.docx;

  if (!docxLib || !docxLib.Document) {
    alert('Word export library not loaded. Check js/vendor/docx.umd.js');
    return;
  }

  const grade = document.getElementById('grade')?.value;
  const scenarioTitle = document.getElementById('scenario')?.value;

  if (!grade || !scenarioTitle) {
    const lang = window.currentLang || 'en';
    alert(lang === 'es'
      ? 'Por favor selecciona un grado y escenario primero.'
      : 'Please select a grade and scenario first.');
    return;
  }

  try {
    const {
      Document, Packer, Paragraph, TextRun,
      HeadingLevel, AlignmentType,
      Table, TableRow, TableCell, WidthType
    } = docxLib;

    const lang = window.currentLang || 'en';
    const theme = document.getElementById('theme')?.value || '';
    const projectId = document.getElementById('project')?.value || '';

    const scenario = C21Engine.getScenarioByTitle(scenarioTitle);
    const project = projectId ? C21Engine.getProjectById(scenarioTitle, projectId) : null;
    const proficiencyLevel = C21Engine.getProficiencyLevel();

    const h = lang === 'es' ? {
      title: "PROYECTO DEL SIGLO XXI",
      s1: "I. Identificación del Proyecto",
      s2: "II. Marco Pedagógico",
      s3: "III. Integración del Idioma",
      s4: "IV. Integración STEAM",
      s5: "V. Estudiante como Agente Social",
      s6: "VI. Plan de Evaluación",
      s7: "VII. Rúbrica Analítica",
      gen: "Documento generado el"
    } : {
      title: "21ST CENTURY PROJECT",
      s1: "I. Project Identification",
      s2: "II. Pedagogical Framework",
      s3: "III. Language Integration",
      s4: "IV. STEAM Integration",
      s5: "V. Student as Social Agent",
      s6: "VI. Assessment Plan",
      s7: "VII. Analytic Rubric",
      gen: "Document generated on"
    };

    function labelValue(label, value) {
      return new Paragraph({
        children: [
          new TextRun({ text: label + ': ', bold: true }),
          new TextRun({ text: value || 'N/A' })
        ],
        spacing: { after: 120 }
      });
    }

    function sectionHead(text) {
      return new Paragraph({
        children: [new TextRun({ text, bold: true, color: '2c5282' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      });
    }

    const children = [];

    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: h.title, bold: true, size: 36, color: '1a365d' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    // Section I
    children.push(sectionHead(h.s1));
    const titleVal = project?.name || scenario?.title || scenarioTitle || 'N/A';
    children.push(labelValue(lang === 'es' ? 'Título del Proyecto' : 'Project Title', titleVal));
    children.push(labelValue(lang === 'es' ? 'Grado' : 'Grade', grade));
    children.push(labelValue(lang === 'es' ? 'Nivel CEFR' : 'CEFR Level', proficiencyLevel || 'N/A'));
    children.push(labelValue(lang === 'es' ? 'Escenario' : 'Scenario', scenarioTitle));
    children.push(labelValue(lang === 'es' ? 'Tema' : 'Theme',
      theme || (lang === 'es' ? 'No especificado' : 'Not specified')));

    // Section II
    children.push(sectionHead(h.s2));
    if (scenario?.global_objective) {
      children.push(labelValue(
        lang === 'es' ? 'Objetivo Global' : 'Global Objective',
        scenario.global_objective));
    }
    if (scenario?.communicative_focus) {
      children.push(labelValue(
        lang === 'es' ? 'Enfoque Comunicativo' : 'Communicative Focus',
        scenario.communicative_focus));
    }

    // Section III
    children.push(sectionHead(h.s3));
    if (typeof adaptByCEFR === 'function') {
      const cefrText = adaptByCEFR(proficiencyLevel || '');
      if (cefrText) {
        children.push(new Paragraph({
          children: [new TextRun({ text: cefrText })],
          spacing: { after: 160 }
        }));
      }
    }
    if (project?.objective) {
      children.push(labelValue(lang === 'es' ? 'Objetivo' : 'Objective', project.objective));
    }
    if (project?.skills) {
      const skillsText = Array.isArray(project.skills)
        ? project.skills.join(', ')
        : (typeof project.skills === 'string' ? project.skills : '');
      if (skillsText) {
        children.push(labelValue(lang === 'es' ? 'Habilidades' : 'Skills', skillsText));
      }
    }
    if (project?.description) {
      children.push(labelValue(lang === 'es' ? 'Descripción' : 'Description', project.description));
    }

    // Section IV
    children.push(sectionHead(h.s4));
    const steamContent = (typeof generateSteamSection === 'function')
      ? generateSteamSection(grade)
      : (lang === 'es'
          ? 'Integración de Ciencia, Tecnología, Ingeniería, Artes y Matemáticas en el proyecto.'
          : 'Integration of Science, Technology, Engineering, Arts, and Mathematics in the project.');
    children.push(new Paragraph({
      children: [new TextRun({ text: steamContent })],
      spacing: { after: 160 }
    }));

    // Section V
    children.push(sectionHead(h.s5));
    const socialText = (typeof generateSocialAgent === 'function' && project?.name)
      ? generateSocialAgent(project.name)
      : (lang === 'es'
          ? 'Los estudiantes aplican el inglés para acción comunitaria significativa.'
          : 'Students apply English for meaningful community action.');
    children.push(new Paragraph({
      children: [new TextRun({ text: socialText })],
      spacing: { after: 160 }
    }));
    if (project?.tech_integration) {
      children.push(labelValue(
        lang === 'es' ? 'Integración Tecnológica' : 'Technology Integration',
        project.tech_integration));
    }

    // Section VI
    children.push(sectionHead(h.s6));
    children.push(new Paragraph({
      children: [new TextRun({
        text: lang === 'es'
          ? 'La evaluación se realizará mediante observación directa, rúbricas analíticas y portafolio de evidencias.'
          : 'Assessment will be conducted through direct observation, analytic rubrics, and portfolio of evidence.'
      })],
      spacing: { after: 160 }
    }));

    // Section VII - Rubric
    children.push(sectionHead(h.s7));
    const rubricHeaders = lang === 'es' ? ['Criterio', '4', '3', '2', '1'] : ['Criteria', '4', '3', '2', '1'];
    const rubricData = lang === 'es' ? [
      ['Precisión del Idioma', 'Avanzado', 'Competente', 'Básico', 'Emergente'],
      ['Desarrollo del Contenido', 'Excelente', 'Bueno', 'Básico', 'Limitado'],
      ['Integración STEAM', 'Completa', 'Adecuada', 'Parcial', 'Mínima'],
      ['Colaboración', 'Consistente', 'Activa', 'Irregular', 'Limitada'],
      ['Impacto Social', 'Significativo', 'Claro', 'Básico', 'Débil']
    ] : [
      ['Language Accuracy', 'Advanced', 'Proficient', 'Basic', 'Emerging'],
      ['Content Development', 'Excellent', 'Good', 'Basic', 'Limited'],
      ['STEAM Integration', 'Full', 'Adequate', 'Partial', 'Minimal'],
      ['Collaboration', 'Consistent', 'Active', 'Irregular', 'Limited'],
      ['Social Impact', 'Significant', 'Clear', 'Basic', 'Weak']
    ];

    function makeCell(text, bold = false, center = false) {
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold })],
          alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT
        })]
      });
    }

    const rubricTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: rubricHeaders.map((h, i) => makeCell(h, true, i > 0))
        }),
        ...rubricData.map(row => new TableRow({
          children: row.map((cell, i) => makeCell(cell, i === 0, i > 0))
        }))
      ]
    });
    children.push(rubricTable);

    // Timestamp
    const timestamp = new Date().toLocaleString(lang === 'es' ? 'es-PA' : 'en-US');
    children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 400 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `${h.gen}: ${timestamp}`, italics: true, size: 18, color: '718096' })],
      alignment: AlignmentType.RIGHT
    }));

    // Build document
    const doc = new Document({ sections: [{ children }] });

    Packer.toBlob(doc).then(blob => {
      const safe = scenarioTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `C21_Project_${grade}_${safe}_${lang.toUpperCase()}.docx`;
      if (typeof saveAs === 'function') {
        saveAs(blob, fileName);
      } else {
        // Fallback para navegadores sin FileSaver
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }).catch(error => {
      console.error('Packer error:', error);
      alert('Error generating file: ' + error.message);
    });

  } catch (error) {
    console.error('exportWord error:', error);
    alert('Export failed: ' + error.message);
  }
}
