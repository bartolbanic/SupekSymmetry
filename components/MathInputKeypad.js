import React, { useState } from 'react';
import styles from '../styles/MathInputKeypad.module.css';

const MathInputKeypad = ({ onInsert }) => {
  const [activeTab, setActiveTab] = useState('common');
  
  const tabs = [
    { id: 'common', label: 'Common' },
    { id: 'trig', label: 'Trigonometric' },
    { id: 'exp', label: 'Exponential' },
    { id: 'poly', label: 'Polynomial' }
  ];
  
  // Symbol sets based on category
  const symbols = {
    common: [
      { display: 'x', value: 'x' },
      { display: 'y', value: 'y' },
      { display: 'π', value: 'pi' },
      { display: 'e', value: 'e' },
      { display: 'x²', value: 'x^2' },
      { display: 'x³', value: 'x^3' },
      { display: '√', value: 'sqrt(' },
      { display: '|x|', value: 'abs(' },
      { display: '<', value: '<' },
      { display: '>', value: '>' },
      { display: '=', value: '=' },
      { display: '≈', value: '≈' },
      { display: 'ans', value: 'ans' },
      { display: ',', value: ',' },
      { display: '(', value: '(' },
      { display: ')', value: ')' }
    ],
    trig: [
      { display: 'sin', value: 'sin(' },
      { display: 'cos', value: 'cos(' },
      { display: 'tan', value: 'tan(' },
      { display: 'csc', value: 'csc(' },
      { display: 'sec', value: 'sec(' },
      { display: 'cot', value: 'cot(' },
      { display: 'asin', value: 'asin(' },
      { display: 'acos', value: 'acos(' },
      { display: 'atan', value: 'atan(' },
      { display: 'sinh', value: 'sinh(' },
      { display: 'cosh', value: 'cosh(' },
      { display: 'tanh', value: 'tanh(' }
    ],
    exp: [
      { display: 'e^x', value: 'exp(' },
      { display: '10^x', value: '10^(' },
      { display: 'ln', value: 'log(' },
      { display: 'log₁₀', value: 'log10(' },
      { display: 'log₂', value: 'log2(' },
      { display: 'x^y', value: '^' }
    ],
    poly: [
      { display: 'x+y', value: '+' },
      { display: 'x-y', value: '-' },
      { display: 'x×y', value: '*' },
      { display: 'x÷y', value: '/' },
      { display: 'x^n', value: '^' },
      { display: 'x²', value: '^2' },
      { display: 'x³', value: '^3' },
      { display: '√x', value: 'sqrt(' },
      { display: '∛x', value: 'cbrt(' },
      { display: '|x|', value: 'abs(' },
      { display: 'mod', value: '%' }
    ]
  };
  
  const handleSymbolClick = (value) => {
    if (onInsert) {
      onInsert(value);
    }
  };
  
  return (
    <div className={styles.mathInputKeypad}>
      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className={styles.symbolsContainer}>
        {symbols[activeTab].map((symbol, index) => (
          <button
            key={index}
            className={styles.symbolButton}
            onClick={() => handleSymbolClick(symbol.value)}
            title={symbol.value}
          >
            {symbol.display}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MathInputKeypad;