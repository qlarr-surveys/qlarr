import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Box, Typography, InputBase } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import styles from './InlineDropdown.module.css';
import { isSessionRtl } from '~/utils/common';

/**
 * InlineDropdown - A text-like dropdown that appears as regular text
 * and reveals a dropdown menu on click.
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
  size = 'small',
  triggerMaxWidth,
}) {
  const isRtl = isSessionRtl();

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
      top: rect.bottom + 4, // 4px gap, matching margin-top from original CSS
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
          }
          break;
        case 'Escape':
          event.preventDefault();
          handleClose();
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
    <Box>
      <Typography variant="body2" className={styles.optionText}>
        {option.label}
      </Typography>
      {option.description && (
        <Typography variant="caption" className={styles.optionDescription}>
          {option.description}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      className={styles.container}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-disabled={disabled}
    >
      {/* Trigger */}
      <Box
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={handleOpen}
      >
        <Typography
          component="span"
          className={`${styles.triggerText} ${isPlaceholder ? styles.triggerPlaceholder : ''}`}
          variant={size === 'small' ? 'body2' : 'body1'}
          sx={triggerMaxWidth ? { width: triggerMaxWidth, maxWidth: triggerMaxWidth } : undefined}
        >
          {displayText}
        </Typography>
        <KeyboardArrowDown
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </Box>

      {/* Dropdown - rendered via Portal */}
      {open && createPortal(
        <Box
          ref={dropdownRef}
          className={styles.dropdown}
          role="listbox"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            ...(isRtl
              ? { right: `${dropdownPosition.right}px` }
              : { left: `${dropdownPosition.left}px` }),
            minWidth: `${Math.max(dropdownPosition.width, 200)}px`,
          }}
        >
          {/* Search input */}
          {searchable && (
            <Box className={styles.searchContainer}>
              <InputBase
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className={styles.searchInput}
                size="small"
                fullWidth
              />
            </Box>
          )}

          {/* Options list */}
          <Box className={styles.optionsList}>
            {groupBy
              ? Object.entries(groupedOptions).map(([groupName, groupOptions]) => {
                  if (groupOptions.length === 0) return null;
                  return (
                    <Box key={groupName}>
                      {groupName && (
                        <Typography className={styles.groupHeader} variant="caption">
                          {groupName}
                        </Typography>
                      )}
                      {groupOptions.map((option) => {
                        const flatIndex = flatOptions.findIndex(
                          (o) => o.value === option.value
                        );
                        return (
                          <Box
                            key={option.value}
                            ref={(el) => (optionRefs.current[flatIndex] = el)}
                            className={`${styles.option} ${
                              option.value === value ? styles.optionSelected : ''
                            } ${flatIndex === focusedIndex ? styles.optionFocused : ''}`}
                            onClick={() => handleSelect(option.value)}
                            role="option"
                            aria-selected={option.value === value}
                          >
                            {renderOption ? renderOption(option) : renderDefaultOption(option)}
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })
              : flatOptions.map((option, index) => (
                  <Box
                    key={option.value}
                    ref={(el) => (optionRefs.current[index] = el)}
                    className={`${styles.option} ${
                      option.value === value ? styles.optionSelected : ''
                    } ${index === focusedIndex ? styles.optionFocused : ''}`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={option.value === value}
                  >
                    {renderOption ? renderOption(option) : renderDefaultOption(option)}
                  </Box>
                ))}

            {flatOptions.length === 0 && (
              <Box className={styles.noOptions}>
                <Typography variant="body2" color="text.secondary">
                  {noOptionsText}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>,
        document.body
      )}
    </Box>
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
  size: PropTypes.oneOf(['small', 'medium']),
  triggerMaxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default InlineDropdown;
