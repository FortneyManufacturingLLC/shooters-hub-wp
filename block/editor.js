(function (wp) {
  if (!wp || !wp.blocks) return;

  const { registerBlockType, registerBlockVariation } = wp.blocks;
  const { InspectorControls, InnerBlocks } = wp.blockEditor || wp.editor;
  const { PanelBody, TextControl, ToggleControl, SelectControl } = wp.components;
  const { __ } = wp.i18n || { __: (s) => s };
  const { createElement: el, Fragment } = wp.element;
  const data = wp.data || {};

  const SUITE_BLOCK = 'shooters-hub/finder-suite';
  const SUITE_CHILDREN = [
    'shooters-hub/finder-suite-settings',
    'shooters-hub/finder-suite-filters',
    'shooters-hub/finder-suite-display',
  ];
  const SUITE_TEMPLATE = SUITE_CHILDREN.map((name) => [name]);

  const textControl = (label, value, onChange, help) =>
    el(TextControl, { label, value: value || '', onChange, help });

  const toggleControl = (label, value, onChange, help) =>
    el(ToggleControl, { label, checked: !!value, onChange, help });

  const selectControl = (label, value, onChange, options, help) =>
    el(SelectControl, { label, value: value || '', onChange, options, help });

  const preview = (title, description, extraLines, hint) =>
    el('div', { className: 'sh-block-preview' }, [
      el('strong', { key: 'title' }, title),
      el('p', { key: 'desc' }, description),
      ...(extraLines || []).map((line, index) =>
        el('span', { key: `line-${index}`, className: 'sh-block-preview-chip' }, line)
      ),
      hint ? el('div', { key: 'hint', className: 'sh-block-preview-hint' }, hint) : null,
    ]);

  const boolLabel = (value) => (value ? __('On', 'shooters-hub') : __('Off', 'shooters-hub'));

  const sharedControls = (attributes, setAttributes, isClub) => [
    textControl(__('Default View', 'shooters-hub'), attributes.defaultView, (defaultView) => setAttributes({ defaultView })),
    textControl(__('Allowed Views (CSV)', 'shooters-hub'), attributes.allowedViews, (allowedViews) => setAttributes({ allowedViews })),
    textControl(__('Latitude', 'shooters-hub'), attributes.lat, (lat) => setAttributes({ lat })),
    textControl(__('Longitude', 'shooters-hub'), attributes.lng, (lng) => setAttributes({ lng })),
    textControl(__('Radius (mi)', 'shooters-hub'), attributes.radius, (radius) => setAttributes({ radius })),
    textControl(__('ZIP', 'shooters-hub'), attributes.zip, (zip) => setAttributes({ zip })),
    textControl(__('Date From (YYYY-MM-DD)', 'shooters-hub'), attributes.from, (from) => setAttributes({ from })),
    textControl(__('Date To (YYYY-MM-DD)', 'shooters-hub'), attributes.to, (to) => setAttributes({ to })),
    textControl(__('Disciplines (CSV)', 'shooters-hub'), attributes.types, (types) => setAttributes({ types })),
    textControl(__('Sub-disciplines (CSV)', 'shooters-hub'), attributes.subDisciplines, (subDisciplines) => setAttributes({ subDisciplines })),
    textControl(__('Tiers (CSV)', 'shooters-hub'), attributes.tiers, (tiers) => setAttributes({ tiers })),
    textControl(__('Statuses (CSV)', 'shooters-hub'), attributes.statuses, (statuses) => setAttributes({ statuses })),
    textControl(__('Series IDs (CSV)', 'shooters-hub'), attributes.series, (series) => setAttributes({ series })),
    textControl(__('Series Mode (or|and)', 'shooters-hub'), attributes.seriesMode, (seriesMode) => setAttributes({ seriesMode })),
    textControl(__('Sort (dateAsc|dateDesc|nameAsc|nameDesc)', 'shooters-hub'), attributes.sort, (sort) => setAttributes({ sort })),
    isClub
      ? textControl(__('Minimum events', 'shooters-hub'), attributes.minEvents, (minEvents) => setAttributes({ minEvents }))
      : null,
    toggleControl(
      __('Hide distance filters', 'shooters-hub'),
      attributes.hideDistanceFilters,
      (hideDistanceFilters) => setAttributes({ hideDistanceFilters })
    ),
    textControl(__('Layout (left|top)', 'shooters-hub'), attributes.layout, (layout) => setAttributes({ layout })),
    toggleControl(__('Lock view switcher', 'shooters-hub'), attributes.lockView, (lockView) => setAttributes({ lockView })),
    toggleControl(__('Lock location inputs', 'shooters-hub'), attributes.lockLocation, (lockLocation) => setAttributes({ lockLocation })),
    toggleControl(__('Lock radius input', 'shooters-hub'), attributes.lockRadius, (lockRadius) => setAttributes({ lockRadius })),
    toggleControl(__('Lock all filters', 'shooters-hub'), attributes.lockFilters, (lockFilters) => setAttributes({ lockFilters })),
    toggleControl(__('Show header', 'shooters-hub'), attributes.showHeader, (showHeader) => setAttributes({ showHeader })),
    toggleControl(__('Show view toggle', 'shooters-hub'), attributes.showViewToggle, (showViewToggle) => setAttributes({ showViewToggle })),
    toggleControl(__('Show filters panel', 'shooters-hub'), attributes.showFiltersPanel, (showFiltersPanel) => setAttributes({ showFiltersPanel })),
    toggleControl(__('Show results toolbar', 'shooters-hub'), attributes.showResultsToolbar, (showResultsToolbar) => setAttributes({ showResultsToolbar })),
    toggleControl(__('Show status messages', 'shooters-hub'), attributes.showStatusMessages, (showStatusMessages) => setAttributes({ showStatusMessages })),
    textControl(
      __('Public app base URL', 'shooters-hub'),
      attributes.publicAppBase,
      (publicAppBase) => setAttributes({ publicAppBase }),
      __('Where detail links should open, e.g. https://shootershub.fortneyengineering.com', 'shooters-hub')
    ),
    textControl(
      __('Theme token overrides (JSON)', 'shooters-hub'),
      attributes.themeTokens,
      (themeTokens) => setAttributes({ themeTokens }),
      __('Example: {"--primary":"#22c55e"}', 'shooters-hub')
    ),
  ].filter(Boolean);

  const suiteState = (clientId) => {
    if (!data.useSelect || !data.useDispatch) {
      return {
        parentClientId: null,
        parentAttributes: null,
        setParentAttributes: () => {},
      };
    }

    const parentClientId = data.useSelect(
      (select) => {
        const editor = select('core/block-editor');
        const parents = editor.getBlockParents(clientId) || [];
        for (let i = 0; i < parents.length; i += 1) {
          const candidateId = parents[i];
          if (editor.getBlockName(candidateId) === SUITE_BLOCK) {
            return candidateId;
          }
        }
        return null;
      },
      [clientId]
    );

    const parentAttributes = data.useSelect(
      (select) => {
        if (!parentClientId) return null;
        return select('core/block-editor').getBlockAttributes(parentClientId) || null;
      },
      [parentClientId]
    );

    const { updateBlockAttributes } = data.useDispatch('core/block-editor');
    const setParentAttributes = (attrs) => {
      if (!parentClientId) return;
      updateBlockAttributes(parentClientId, attrs);
    };

    return { parentClientId, parentAttributes, setParentAttributes };
  };

  const suiteMissing = () =>
    preview(
      __('Finder Suite Block', 'shooters-hub'),
      __('Add this block inside a Finder Suite container.', 'shooters-hub')
    );

  registerBlockType('shooters-hub/match-finder', {
    edit: ({ attributes, setAttributes }) =>
      el(Fragment, null, [
        el(InspectorControls, { key: 'controls' }, [
          el(PanelBody, { title: __('Match Finder Settings', 'shooters-hub'), initialOpen: true }, sharedControls(attributes, setAttributes, false)),
        ]),
        preview(
          __('Shooters Hub Match Finder', 'shooters-hub'),
          __('Front-end rendering uses the live Shooters Hub Match Finder component.', 'shooters-hub')
        ),
      ]),
    save: () => null,
  });

  registerBlockType('shooters-hub/club-finder', {
    edit: ({ attributes, setAttributes }) =>
      el(Fragment, null, [
        el(InspectorControls, { key: 'controls' }, [
          el(PanelBody, { title: __('Club Finder Settings', 'shooters-hub'), initialOpen: true }, sharedControls(attributes, setAttributes, true)),
        ]),
        preview(
          __('Shooters Hub Club Finder', 'shooters-hub'),
          __('Front-end rendering uses the live Shooters Hub Club Finder component.', 'shooters-hub')
        ),
      ]),
    save: () => null,
  });

  registerBlockType(SUITE_BLOCK, {
    edit: ({ attributes, setAttributes }) => {
      const mode = attributes.mode === 'clubs' ? 'clubs' : 'matches';
      const summary = [
        `${__('Mode', 'shooters-hub')}: ${mode}`,
        `${__('Layout', 'shooters-hub')}: ${attributes.layout || __('default', 'shooters-hub')}`,
        `${__('Views', 'shooters-hub')}: ${attributes.allowedViews || __('global defaults', 'shooters-hub')}`,
        `${__('Header', 'shooters-hub')}: ${boolLabel(attributes.showHeader)}`,
      ];

      return el(Fragment, null, [
        el(InspectorControls, { key: 'suite-controls' }, [
          el(PanelBody, { title: __('Finder Suite', 'shooters-hub'), initialOpen: true }, [
            selectControl(
              __('Mode', 'shooters-hub'),
              mode,
              (nextMode) => setAttributes({ mode: nextMode === 'clubs' ? 'clubs' : 'matches' }),
              [
                { label: __('Match Finder', 'shooters-hub'), value: 'matches' },
                { label: __('Club Finder', 'shooters-hub'), value: 'clubs' },
              ]
            ),
            textControl(__('Allowed Views (CSV)', 'shooters-hub'), attributes.allowedViews, (allowedViews) => setAttributes({ allowedViews })),
            textControl(__('Default View', 'shooters-hub'), attributes.defaultView, (defaultView) => setAttributes({ defaultView })),
            textControl(__('Layout (left|top)', 'shooters-hub'), attributes.layout, (layout) => setAttributes({ layout })),
            textControl(__('Public app base URL', 'shooters-hub'), attributes.publicAppBase, (publicAppBase) => setAttributes({ publicAppBase })),
          ]),
        ]),
        preview(
          __('Shooters Hub Finder Suite', 'shooters-hub'),
          __('Compose shared finder controls with child blocks below. Frontend output is the full live finder.', 'shooters-hub'),
          summary,
          __('Use child blocks to edit settings, filters, and display/locks as separate modules.', 'shooters-hub')
        ),
        el(InnerBlocks, {
          allowedBlocks: SUITE_CHILDREN,
          template: SUITE_TEMPLATE,
          templateLock: false,
        }),
      ]);
    },
    save: () => null,
  });

  registerBlockType('shooters-hub/finder-suite-settings', {
    edit: ({ clientId }) => {
      const { parentAttributes, setParentAttributes } = suiteState(clientId);
      if (!parentAttributes) return suiteMissing();

      return el(Fragment, null, [
        el(InspectorControls, { key: 'suite-settings-controls' }, [
          el(PanelBody, { title: __('Suite Settings', 'shooters-hub'), initialOpen: true }, [
            selectControl(
              __('Mode', 'shooters-hub'),
              parentAttributes.mode === 'clubs' ? 'clubs' : 'matches',
              (mode) => setParentAttributes({ mode: mode === 'clubs' ? 'clubs' : 'matches' }),
              [
                { label: __('Match Finder', 'shooters-hub'), value: 'matches' },
                { label: __('Club Finder', 'shooters-hub'), value: 'clubs' },
              ]
            ),
            textControl(__('Allowed Views (CSV)', 'shooters-hub'), parentAttributes.allowedViews, (allowedViews) => setParentAttributes({ allowedViews })),
            textControl(__('Default View', 'shooters-hub'), parentAttributes.defaultView, (defaultView) => setParentAttributes({ defaultView })),
            textControl(__('Layout (left|top)', 'shooters-hub'), parentAttributes.layout, (layout) => setParentAttributes({ layout })),
            toggleControl(
              __('Hide distance filters', 'shooters-hub'),
              parentAttributes.hideDistanceFilters,
              (hideDistanceFilters) => setParentAttributes({ hideDistanceFilters })
            ),
            textControl(__('Public app base URL', 'shooters-hub'), parentAttributes.publicAppBase, (publicAppBase) => setParentAttributes({ publicAppBase })),
            textControl(__('Theme token overrides (JSON)', 'shooters-hub'), parentAttributes.themeTokens, (themeTokens) => setParentAttributes({ themeTokens })),
          ]),
        ]),
        preview(
          __('Finder Suite Settings', 'shooters-hub'),
          __('Controls the shared finder mode and integration options.', 'shooters-hub'),
          [
            `${__('Mode', 'shooters-hub')}: ${parentAttributes.mode === 'clubs' ? 'clubs' : 'matches'}`,
            `${__('Layout', 'shooters-hub')}: ${parentAttributes.layout || __('default', 'shooters-hub')}`,
            `${__('Views', 'shooters-hub')}: ${parentAttributes.allowedViews || __('global defaults', 'shooters-hub')}`,
          ],
          __('Open block sidebar to edit suite settings.', 'shooters-hub')
        ),
      ]);
    },
    save: () => null,
  });

  registerBlockType('shooters-hub/finder-suite-filters', {
    edit: ({ clientId }) => {
      const { parentAttributes, setParentAttributes } = suiteState(clientId);
      if (!parentAttributes) return suiteMissing();
      const isClub = parentAttributes.mode === 'clubs';

      return el(Fragment, null, [
        el(InspectorControls, { key: 'suite-filter-controls' }, [
          el(PanelBody, { title: __('Suite Filters', 'shooters-hub'), initialOpen: true }, [
            textControl(__('Latitude', 'shooters-hub'), parentAttributes.lat, (lat) => setParentAttributes({ lat })),
            textControl(__('Longitude', 'shooters-hub'), parentAttributes.lng, (lng) => setParentAttributes({ lng })),
            textControl(__('Radius (mi)', 'shooters-hub'), parentAttributes.radius, (radius) => setParentAttributes({ radius })),
            textControl(__('ZIP', 'shooters-hub'), parentAttributes.zip, (zip) => setParentAttributes({ zip })),
            textControl(__('Date From (YYYY-MM-DD)', 'shooters-hub'), parentAttributes.from, (from) => setParentAttributes({ from })),
            textControl(__('Date To (YYYY-MM-DD)', 'shooters-hub'), parentAttributes.to, (to) => setParentAttributes({ to })),
            textControl(__('Disciplines (CSV)', 'shooters-hub'), parentAttributes.types, (types) => setParentAttributes({ types })),
            textControl(__('Sub-disciplines (CSV)', 'shooters-hub'), parentAttributes.subDisciplines, (subDisciplines) => setParentAttributes({ subDisciplines })),
            textControl(__('Tiers (CSV)', 'shooters-hub'), parentAttributes.tiers, (tiers) => setParentAttributes({ tiers })),
            textControl(__('Statuses (CSV)', 'shooters-hub'), parentAttributes.statuses, (statuses) => setParentAttributes({ statuses })),
            textControl(__('Series IDs (CSV)', 'shooters-hub'), parentAttributes.series, (series) => setParentAttributes({ series })),
            textControl(__('Series Mode (or|and)', 'shooters-hub'), parentAttributes.seriesMode, (seriesMode) => setParentAttributes({ seriesMode })),
            textControl(__('Sort (dateAsc|dateDesc|nameAsc|nameDesc)', 'shooters-hub'), parentAttributes.sort, (sort) => setParentAttributes({ sort })),
            isClub
              ? textControl(__('Minimum events', 'shooters-hub'), parentAttributes.minEvents, (minEvents) => setParentAttributes({ minEvents }))
              : null,
          ].filter(Boolean)),
        ]),
        preview(
          __('Finder Suite Filters', 'shooters-hub'),
          __('Controls the shared filter defaults used by all suite views.', 'shooters-hub'),
          [
            `${__('Disciplines', 'shooters-hub')}: ${parentAttributes.types || __('none', 'shooters-hub')}`,
            `${__('Series', 'shooters-hub')}: ${parentAttributes.series || __('none', 'shooters-hub')}`,
            `${__('Date Range', 'shooters-hub')}: ${parentAttributes.from || '...'} → ${parentAttributes.to || '...'}`,
          ],
          __('Open block sidebar to edit shared filters.', 'shooters-hub')
        ),
      ]);
    },
    save: () => null,
  });

  registerBlockType('shooters-hub/finder-suite-display', {
    edit: ({ clientId }) => {
      const { parentAttributes, setParentAttributes } = suiteState(clientId);
      if (!parentAttributes) return suiteMissing();

      return el(Fragment, null, [
        el(InspectorControls, { key: 'suite-display-controls' }, [
          el(PanelBody, { title: __('Suite Display and Locks', 'shooters-hub'), initialOpen: true }, [
            toggleControl(__('Lock view switcher', 'shooters-hub'), parentAttributes.lockView, (lockView) => setParentAttributes({ lockView })),
            toggleControl(__('Lock location inputs', 'shooters-hub'), parentAttributes.lockLocation, (lockLocation) => setParentAttributes({ lockLocation })),
            toggleControl(__('Lock radius input', 'shooters-hub'), parentAttributes.lockRadius, (lockRadius) => setParentAttributes({ lockRadius })),
            toggleControl(__('Lock all filters', 'shooters-hub'), parentAttributes.lockFilters, (lockFilters) => setParentAttributes({ lockFilters })),
            toggleControl(__('Show header', 'shooters-hub'), parentAttributes.showHeader, (showHeader) => setParentAttributes({ showHeader })),
            toggleControl(__('Show view toggle', 'shooters-hub'), parentAttributes.showViewToggle, (showViewToggle) => setParentAttributes({ showViewToggle })),
            toggleControl(__('Show filters panel', 'shooters-hub'), parentAttributes.showFiltersPanel, (showFiltersPanel) => setParentAttributes({ showFiltersPanel })),
            toggleControl(__('Show results toolbar', 'shooters-hub'), parentAttributes.showResultsToolbar, (showResultsToolbar) => setParentAttributes({ showResultsToolbar })),
            toggleControl(__('Show status messages', 'shooters-hub'), parentAttributes.showStatusMessages, (showStatusMessages) => setParentAttributes({ showStatusMessages })),
          ]),
        ]),
        preview(
          __('Finder Suite Display', 'shooters-hub'),
          __('Controls lock behavior and shared UI visibility.', 'shooters-hub'),
          [
            `${__('Header', 'shooters-hub')}: ${boolLabel(parentAttributes.showHeader)}`,
            `${__('Filters Panel', 'shooters-hub')}: ${boolLabel(parentAttributes.showFiltersPanel)}`,
            `${__('Lock Filters', 'shooters-hub')}: ${boolLabel(parentAttributes.lockFilters)}`,
          ],
          __('Open block sidebar to edit display and lock behavior.', 'shooters-hub')
        ),
      ]);
    },
    save: () => null,
  });

  const registerFinderVariations = (blockName, labelPrefix) => {
    if (typeof registerBlockVariation !== 'function') return;
    registerBlockVariation(blockName, {
      name: `${blockName.replace('/', '-')}-full-ui`,
      title: `${labelPrefix}: Full UI`,
      description: 'Complete finder layout with filters, view toggle, and results toolbar.',
      attributes: {
        showHeader: true,
        showViewToggle: true,
        showFiltersPanel: true,
        showResultsToolbar: true,
        showStatusMessages: true,
      },
      isDefault: false,
    });
    registerBlockVariation(blockName, {
      name: `${blockName.replace('/', '-')}-filters-panel`,
      title: `${labelPrefix}: Filters Panel`,
      description: 'Preset focused on filter controls for custom page layouts.',
      attributes: {
        showHeader: false,
        showViewToggle: false,
        showFiltersPanel: true,
        showResultsToolbar: false,
        showStatusMessages: false,
      },
      isDefault: false,
    });
    registerBlockVariation(blockName, {
      name: `${blockName.replace('/', '-')}-views-only`,
      title: `${labelPrefix}: View Toggle`,
      description: 'Preset focused on view switching controls.',
      attributes: {
        showHeader: false,
        showViewToggle: true,
        showFiltersPanel: false,
        showResultsToolbar: false,
        showStatusMessages: false,
      },
      isDefault: false,
    });
    registerBlockVariation(blockName, {
      name: `${blockName.replace('/', '-')}-results`,
      title: `${labelPrefix}: Results Focus`,
      description: 'Preset focused on result rendering and toolbar.',
      attributes: {
        showHeader: false,
        showViewToggle: false,
        showFiltersPanel: false,
        showResultsToolbar: true,
        showStatusMessages: true,
      },
      isDefault: false,
    });
  };

  registerFinderVariations('shooters-hub/match-finder', 'Match Finder');
  registerFinderVariations('shooters-hub/club-finder', 'Club Finder');
})(window.wp);
