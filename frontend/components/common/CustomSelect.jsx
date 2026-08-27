import React, { forwardRef } from 'react';
import Select from 'react-select';

const customStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'white',
        borderColor: state.isFocused ? '#FFCA00' : '#e5e7eb',
        borderRadius: '8px',
        padding: '2px',
        boxShadow: 'none',
        '&:hover': {
            borderColor: '#FFCA00',
        },
        color: '#4b5563',
        minHeight: '40px',
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0 8px',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '0',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    }),
    menuPortal: (provided) => ({
        ...provided,
        zIndex: 99999,
    }),
    menuList: (provided) => ({
        ...provided,
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '4px',
        // Use custom scrollbar if defined in globals.css
        '&::-webkit-scrollbar': {
            width: '6px',
        },
        '&::-webkit-scrollbar-track': {
            background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
            background: '#d0d0d0',
            borderRadius: '10px',
        },
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#FFCA00' : state.isFocused ? '#fff7ed' : 'white',
        color: state.isSelected ? 'white' : '#4b5563',
        cursor: state.isDisabled ? 'not-allowed' : 'pointer',
        opacity: state.isDisabled ? 0.6 : 1,
        fontSize: '14px',
        borderRadius: '4px',
        margin: '2px 0',
        '&:active': {
            backgroundColor: state.isDisabled ? 'white' : '#FFCA00',
        },
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
        paddingRight: '6px',
    }),
    dropdownIndicator: (provided) => ({
        ...provided,
        color: '#9ca3af',
        padding: '8px',
        '&:hover': {
            color: '#4b5563',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: '#4b5563',
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#9ca3af',
    }),
    input: (provided) => ({
        ...provided,
        color: '#4b5563',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
};

const CustomSelect = forwardRef(({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    isSearchable = true,
    isMulti = false,
    className = '',
    ...props
}, ref) => {
    // Determine the current value object(s) for react-select
    const selectedOption = isMulti
        ? options.filter(opt => Array.isArray(value) && value.includes(opt.value))
        : options.find(opt => opt.value === value) || null;

    const [menuPortalTarget, setMenuPortalTarget] = React.useState(null);

    React.useEffect(() => {
        setMenuPortalTarget(document.body);
    }, []);

    const handleChange = (selected) => {
        if (onChange) {
            if (isMulti) {
                onChange(selected ? selected.map(opt => opt.value) : []);
            } else {
                onChange(selected ? selected.value : '');
            }
        }
    };

    // Check if className contains border-related classes
    const hasBorderClass = className && /border/.test(className);

    // Create dynamic styles based on whether border classes are passed
    const dynamicStyles = {
        ...customStyles,
        control: (provided, state) => {
            const baseStyles = customStyles.control(provided, state);

            // If border classes are passed via className, remove default border styles
            if (hasBorderClass) {
                return {
                    ...baseStyles,
                    border: 'none',
                    borderColor: 'transparent',
                    '&:hover': {
                        borderColor: 'transparent',
                    },
                };
            }

            // Otherwise, use default border styles
            return baseStyles;
        },
    };

    return (
        <div className={`custom-select-wrapper ${className}`}>
            <Select
                ref={ref}
                options={options}
                value={selectedOption}
                onChange={handleChange}
                styles={dynamicStyles}
                placeholder={placeholder}
                isSearchable={isSearchable}
                menuPlacement="auto"
                minMenuHeight={250}
                menuShouldScrollIntoView={true}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
                isOptionDisabled={(option) => option.isDisabled}
                formatOptionLabel={(option) => (
                    <div className="flex flex-col py-0.5">
                        <span className="font-medium text-gray-700 leading-tight">{option.label}</span>
                        {option.isDisabled && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-0.5">
                                Out of Stock
                            </span>
                        )}
                    </div>
                )}
                {...props}
            />
        </div>
    );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
