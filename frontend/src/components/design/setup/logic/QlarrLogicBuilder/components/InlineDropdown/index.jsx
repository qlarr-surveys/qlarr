import React, { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import styles from './InlineDropdown.module.css';
import { isSessionRtl } from '~/utils/common';

const cx = (...names) => names.filter(Boolean).join(' ');

/**
 * InlineDropdown - a condition's field: a flat line that shows the choice and
 * opens a searchable list under it (docs/design/editor-phase-3.3.html).
 *
 * The list is portalled so the settings panel's scroll doesn't clip it, and it
 * follows the line when the panel scrolls. `defaultOpen` opens it on mount,
 * for a condition that was just added and still needs its field.
 */
export function InlineDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  noOptionsText = 'No options found',
  groupBy,
  searchable = false,
  disabled = false,
  renderValue,
  renderOption,
  ariaLabel,
  defaultOpen = false,
}) {
  const isRtl = isSessionRtl();
  const listId = useId();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0, width: 0 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);
  const triggerRef = useRef(null);

  // Find the selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(lowerSearch) ||
        opt.code?.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  // Group options if groupBy is provided
  const groupedOptions = useMemo(() => {
    if (!groupBy) return { ungrouped: filteredOptions };

    const groups = {};
    filteredOptions.forEach((opt) => {
      const group = groupBy(opt) || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions, groupBy]);

  // Flatten grouped options for keyboard navigation
  const flatOptions = useMemo(() => {
    if (!groupBy) return filteredOptions;
    return Object.values(groupedOptions).flat();
  }, [groupBy, groupedOptions, filteredOptions]);

  // Calculate dropdown position based on trigger element
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
      width: rect.width,
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
    updateDropdownPosition();
  }, [disabled, updateDropdownPosition]);

  const toggle = useCallback(() => {
    if (open) handleClose();
    else handleOpen();
  }, [open, handleClose, handleOpen]);

  useEffect(() => {
    if (defaultOpen) handleOpen();
    // Only on mount: a condition that was just added opens its list once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle click outside to close, and reposition on scroll/resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    const handleScroll = () => {
      if (open) {
        updateDropdownPosition();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Capture phase to catch all scrolls
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [open, handleClose, updateDropdownPosition]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, searchable]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (optionValue) => {
      onChange(optionValue);
      handleClose();
      containerRef.current?.focus();
    },
    [onChange, handleClose]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!open) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, flatOptions.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && flatOptions[focusedIndex]) {
            handleSelect(flatOptions[focusedIndex].value);
          } else if (flatOptions.length === 1) {
            handleSelect(flatOptions[0].value);
          }
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          handleClose();
          containerRef.current?.focus();
          break;
        case 'Tab':
          handleClose();
          break;
        default:
          break;
      }
    },
    [open, flatOptions, focusedIndex, handleOpen, handleClose, handleSelect]
  );

  // Display value
  const displayText = useMemo(() => {
    if (renderValue && selectedOption) {
      return renderValue(selectedOption);
    }
    return selectedOption?.label || placeholder;
  }, [renderValue, selectedOption, placeholder]);

  const isPlaceholder = !selectedOption;

  // Default option content renderer
  const renderDefaultOption = (option) => (
    <span className={styles.optionBody}>
      <span className={styles.optionText}>{option.label}</span>
      {option.description && (
        <span className={styles.optionDescription}>{option.description}</span>
      )}
    </span>
  );

  const renderOptionRow = (option, index) => (
    <div
      key={option.value}
      ref={(el) => (optionRefs.current[index] = el)}
      className={cx(
        styles.option,
        option.value === value && styles.optionSelected,
        index === focusedIndex && styles.optionFocused
      )}
      onClick={() => handleSelect(option.value)}
      role="option"
      aria-selected={option.value === value}
    >
      {renderOption ? renderOption(option) : renderDefaultOption(option)}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={open ? listId : undefined}
      aria-disabled={disabled}
    >
      <div
        ref={triggerRef}
        className={cx(
          styles.trigger,
          open && styles.triggerOpen,
          disabled && styles.triggerDisabled
        )}
        onClick={toggle}
      >
        <span
          className={cx(styles.triggerText, isPlaceholder && styles.triggerPlaceholder)}
        >
          {displayText}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          strokeWidth={2}
          className={cx(styles.chevron, open && styles.chevronOpen)}
        />
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className={styles.dropdown}
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            ...(isRtl
              ? { right: `${dropdownPosition.right}px` }
              : { left: `${dropdownPosition.left}px` }),
            minWidth: `${Math.max(dropdownPosition.width, 200)}px`,
          }}
        >
          {searchable && (
            <div className={styles.searchContainer}>
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                className={styles.searchInput}
              />
            </div>
          )}

          <div id={listId} role="listbox" aria-label={ariaLabel} className={styles.optionsList}>
            {groupBy
              ? Object.entries(groupedOptions).map(([groupName, groupOptions]) => {
                  if (groupOptions.length === 0) return null;
                  return (
                    <div key={groupName} role="group" aria-label={groupName || undefined}>
                      {groupName && (
                        <div className={styles.groupHeader}>{groupName}</div>
                      )}
                      {groupOptions.map((option) =>
                        renderOptionRow(
                          option,
                          flatOptions.findIndex((o) => o.value === option.value)
                        )
                      )}
                    </div>
                  );
                })
              : flatOptions.map((option, index) => renderOptionRow(option, index))}

            {flatOptions.length === 0 && (
              <div className={styles.noOptions} role="presentation">
                {noOptionsText}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

InlineDropdown.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      code: PropTypes.string,
      group: PropTypes.string,
      description: PropTypes.string,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  noOptionsText: PropTypes.string,
  groupBy: PropTypes.func,
  searchable: PropTypes.bool,
  disabled: PropTypes.bool,
  renderValue: PropTypes.func,
  renderOption: PropTypes.func,
  ariaLabel: PropTypes.string,
  defaultOpen: PropTypes.bool,
};

export default InlineDropdown;
