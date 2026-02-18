(function (wp) {
  if (!wp || !wp.blocks) return;

  const { registerBlockType } = wp.blocks;
  const { InspectorControls } = wp.blockEditor || wp.editor;
  const { PanelBody, TextControl, ToggleControl } = wp.components;
  const { __ } = wp.i18n || { __: (s) => s };
  const { createElement: el, Fragment } = wp.element;

  const textControl = (label, value, onChange, help) =>
    el(TextControl, { label, value: value || '', onChange, help });

  const toggleControl = (label, value, onChange, help) =>
    el(ToggleControl, { label, checked: !!value, onChange, help });

  const preview = (title, description) =>
    el('div', { className: 'sh-block-preview' }, [
      el('strong', { key: 'title' }, title),
      el('p', { key: 'desc' }, description),
    ]);

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
})(window.wp);
