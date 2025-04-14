
// // Country coordinates data - simplified world map data
// export const landPoints = [
//     // North America
//     [
//         [48, -124], [50, -122], [48, -120], [45, -122], [42, -124], [40, -124], [37, -122], [33, -117],
//         [32, -114], [32, -112], [31, -111], [31, -106], [29, -103], [29, -99], [28, -97], [27, -97],
//         [26, -97], [30, -94], [31, -93], [33, -91], [30, -90], [29, -89], [30, -88], [31, -85],
//         [30, -84], [28, -82], [26, -80], [25, -81], [27, -82], [31, -81], [32, -80], [35, -77],
//         [37, -76], [38, -75], [39, -74], [41, -72], [42, -71], [43, -70], [45, -67], [47, -68],
//         [48, -69], [48, -67], [45, -66], [45, -64], [46, -63], [47, -65], [48, -65], [49, -64],
//         [48, -62], [49, -60], [51, -57], [52, -56], [51, -55], [52, -56], [53, -59], [54, -58],
//         [56, -60], [57, -62], [58, -65], [60, -65], [62, -68], [63, -70], [64, -77], [66, -82],
//         [67, -86], [68, -90], [69, -95], [70, -103], [70, -110], [70, -120], [68, -130], [69, -135],
//         [69, -140], [66, -141], [63, -144], [60, -146], [58, -152], [56, -154], [55, -160], [52, -167],
//         [52, -172], [54, -170], [57, -170], [59, -165], [57, -160], [55, -155], [54, -148], [57, -142],
//         [58, -136], [56, -132], [54, -130], [51, -128], [49, -123], [48, -124]
//     ],
//     // South America
//     [
//         [12, -73], [10, -75], [8, -77], [9, -80], [6, -77], [4, -78], [2, -79], [0, -81], [-3, -80],
//         [-6, -81], [-9, -79], [-12, -77], [-14, -76], [-16, -74], [-18, -71], [-20, -70], [-24, -71],
//         [-27, -71], [-30, -72], [-33, -71], [-35, -73], [-39, -73], [-42, -73], [-44, -73], [-47, -74],
//         [-50, -74], [-53, -72], [-55, -70], [-55, -69], [-52, -69], [-50, -70], [-48, -68], [-46, -67],
//         [-43, -65], [-40, -63], [-37, -60], [-35, -58], [-32, -58], [-30, -56], [-28, -55], [-24, -58],
//         [-22, -60], [-20, -58], [-17, -58], [-15, -60], [-12, -61], [-10, -63], [-8, -65], [-6, -67],
//         [-4, -70], [-1, -72], [1, -75], [4, -74], [6, -72], [9, -73], [10, -72], [12, -73]
//     ],
//     // Europe
//     [
//         [36, -10], [38, -9], [40, -9], [42, -9], [44, -10], [44, -8], [43, -5], [43, -2], [42, 0],
//         [43, 2], [42, 4], [43, 5], [44, 8], [45, 10], [44, 12], [44, 14], [42, 15], [41, 17],
//         [40, 19], [38, 18], [37, 16], [37, 15], [39, 13], [40, 10], [40, 8], [38, 8], [37, 14],
//         [35, 12], [36, 10], [35, 16], [38, 26], [40, 29], [42, 27], [45, 29], [47, 30], [49, 32],
//         [52, 24], [54, 20], [57, 22], [59, 18], [60, 21], [62, 24], [64, 26], [66, 26], [68, 25],
//         [69, 21], [68, 18], [65, 14], [65, 12], [64, 10], [64, 8], [63, 11], [60, 11], [58, 7],
//         [58, 5], [57, 8], [55, 9], [54, 8], [54, 12], [56, 12], [56, 16], [54, 18], [52, 14],
//         [51, 4], [50, 2], [48, -1], [44, -1], [42, -2], [39, -9], [36, -10]
//     ],
//     // Africa
//     [
//         [12, -17], [15, -17], [18, -16], [20, -13], [24, -15], [28, -15], [31, -10], [33, -7], [36, -5],
//         [39, -2], [40, 3], [42, 10], [42, 14], [41, 20], [37, 22], [32, 24], [30, 33], [27, 34],
//         [22, 37], [16, 38], [12, 44], [12, 48], [10, 44], [5, 40], [1, 40], [-5, 39], [-10, 40],
//         [-15, 40], [-20, 40], [-25, 35], [-26, 32], [-26, 28], [-28, 25], [-30, 22], [-32, 18],
//         [-34, 19], [-34, 22], [-28, 17], [-25, 15], [-22, 14], [-18, 12], [-15, 12], [-12, 13],
//         [-10, 13], [-8, 12], [-6, 10], [-4, 7], [-2, 6], [0, 8], [2, 9], [5, 6], [8, 2], [10, 0],
//         [12, -3], [10, -8], [10, -12], [10, -15], [12, -17]
//     ],
//     // Asia
//     [
//         [30, 25], [28, 30], [30, 35], [32, 40], [35, 45], [38, 48], [42, 50], [45, 55], [48, 58],
//         [50, 60], [55, 65], [58, 68], [60, 70], [65, 75], [68, 78], [70, 80], [72, 85], [70, 90],
//         [68, 95], [65, 98], [62, 100], [60, 105], [58, 110], [55, 115], [52, 120], [50, 125],
//         [48, 130], [45, 135], [42, 140], [38, 142], [35, 140], [32, 137], [30, 135], [28, 130],
//         [25, 125], [22, 120], [18, 115], [15, 110], [12, 105], [8, 100], [5, 95], [2, 98],
//         [0, 100], [-2, 102], [-5, 105], [-6, 108], [-5, 110], [-2, 112], [0, 115], [2, 118],
//         [5, 120], [8, 125], [10, 128], [12, 130], [15, 135], [18, 138], [20, 140], [22, 145],
//         [25, 148], [28, 150], [30, 148], [32, 145], [35, 140], [38, 135], [40, 132], [42, 130],
//         [40, 125], [38, 120], [40, 115], [42, 112], [45, 110], [48, 105], [50, 100], [52, 95],
//         [55, 90], [58, 85], [60, 80], [58, 75], [55, 70], [52, 65], [50, 60], [48, 55], [45, 50],
//         [42, 45], [40, 40], [38, 35], [35, 30], [32, 25], [30, 25]
//     ],
//     // Australia
//     [
//         [-10, 112], [-12, 115], [-15, 118], [-18, 122], [-20, 125], [-22, 128], [-25, 130],
//         [-28, 132], [-30, 135], [-32, 138], [-35, 140], [-38, 142], [-40, 145], [-42, 148],
//         [-40, 150], [-38, 152], [-35, 155], [-32, 153], [-30, 150], [-28, 148], [-25, 145],
//         [-22, 142], [-20, 140], [-18, 135], [-15, 132], [-12, 130], [-10, 125], [-8, 120],
//         [-10, 115], [-10, 112]
//     ]
// ];

// Country coordinates data - normalized world map data with consistent point density
export const landPoints = [
    // North America - Original density (reference)
    [
        [48, -124], [50, -122], [48, -120], [45, -122], [42, -124], [40, -124], [37, -122], [33, -117],
        [32, -114], [32, -112], [31, -111], [31, -106], [29, -103], [29, -99], [28, -97], [27, -97],
        [26, -97], [30, -94], [31, -93], [33, -91], [30, -90], [29, -89], [30, -88], [31, -85],
        [30, -84], [28, -82], [26, -80], [25, -81], [27, -82], [31, -81], [32, -80], [35, -77],
        [37, -76], [38, -75], [39, -74], [41, -72], [42, -71], [43, -70], [45, -67], [47, -68],
        [48, -69], [48, -67], [45, -66], [45, -64], [46, -63], [47, -65], [48, -65], [49, -64],
        [48, -62], [49, -60], [51, -57], [52, -56], [51, -55], [52, -56], [53, -59], [54, -58],
        [56, -60], [57, -62], [58, -65], [60, -65], [62, -68], [63, -70], [64, -77], [66, -82],
        [67, -86], [68, -90], [69, -95], [70, -103], [70, -110], [70, -120], [68, -130], [69, -135],
        [69, -140], [66, -141], [63, -144], [60, -146], [58, -152], [56, -154], [55, -160], [52, -167],
        [52, -172], [54, -170], [57, -170], [59, -165], [57, -160], [55, -155], [54, -148], [57, -142],
        [58, -136], [56, -132], [54, -130], [51, -128], [49, -123], [48, -124]
    ],
    // South America - Density increased
    [
        [12, -73], [11, -74], [10, -75], [9, -76], [8, -77], [8.5, -78.5], [9, -80], [7.5, -78.5], [6, -77], 
        [5, -77.5], [4, -78], [3, -78.5], [2, -79], [1, -80], [0, -81], [-1.5, -80.5], [-3, -80], [-4.5, -80.5], 
        [-6, -81], [-7.5, -80], [-9, -79], [-10.5, -78], [-12, -77], [-13, -76.5], [-14, -76], [-15, -75], 
        [-16, -74], [-17, -72.5], [-18, -71], [-19, -70.5], [-20, -70], [-22, -70.5], [-24, -71], [-25.5, -71], 
        [-27, -71], [-28.5, -71.5], [-30, -72], [-31.5, -71.5], [-33, -71], [-34, -72], [-35, -73], [-37, -73], 
        [-39, -73], [-40.5, -73], [-42, -73], [-43, -73], [-44, -73], [-45.5, -73.5], [-47, -74], [-48.5, -74], 
        [-50, -74], [-51.5, -73], [-53, -72], [-54, -71], [-55, -70], [-55, -69.5], [-55, -69], [-53.5, -69], 
        [-52, -69], [-51, -69.5], [-50, -70], [-49, -69], [-48, -68], [-47, -67.5], [-46, -67], [-44.5, -66], 
        [-43, -65], [-41.5, -64], [-40, -63], [-38.5, -61.5], [-37, -60], [-36, -59], [-35, -58], [-33.5, -58], 
        [-32, -58], [-31, -57], [-30, -56], [-29, -55.5], [-28, -55], [-26, -56.5], [-24, -58], [-23, -59], 
        [-22, -60], [-21, -59], [-20, -58], [-18.5, -58], [-17, -58], [-16, -59], [-15, -60], [-13.5, -60.5], 
        [-12, -61], [-11, -62], [-10, -63], [-9, -64], [-8, -65], [-7, -66], [-6, -67], [-5, -68.5], [-4, -70], 
        [-2.5, -71], [-1, -72], [0, -73.5], [1, -75], [2.5, -74.5], [4, -74], [5, -73], [6, -72], [7.5, -72.5], 
        [9, -73], [10, -72.5], [11, -72.8], [12, -73]
    ],
    // Europe - Density adjusted
    [
        [36, -10], [37, -9.5], [38, -9], [39, -9], [40, -9], [41, -9], [42, -9], [43, -9.5], [44, -10], 
        [44, -9], [44, -8], [43.5, -6.5], [43, -5], [43, -3.5], [43, -2], [42.5, -1], [42, 0], [42.5, 1], 
        [43, 2], [42.5, 3], [42, 4], [42.5, 4.5], [43, 5], [43.5, 6.5], [44, 8], [44.5, 9], [45, 10], 
        [44.5, 11], [44, 12], [44, 13], [44, 14], [43, 14.5], [42, 15], [41.5, 16], [41, 17], [40.5, 18], 
        [40, 19], [39, 18.5], [38, 18], [37.5, 17], [37, 16], [37, 15.5], [37, 15], [38, 14], [39, 13], 
        [39.5, 11.5], [40, 10], [40, 9], [40, 8], [39, 8], [38, 8], [37.5, 11], [37, 14], [36, 13], [35, 12], 
        [35.5, 11], [36, 10], [35.5, 13], [35, 16], [36.5, 21], [38, 26], [39, 27.5], [40, 29], [41, 28], 
        [42, 27], [43.5, 28], [45, 29], [46, 29.5], [47, 30], [48, 31], [49, 32], [50.5, 28], [52, 24], 
        [53, 22], [54, 20], [55.5, 21], [57, 22], [58, 20], [59, 18], [59.5, 19.5], [60, 21], [61, 22.5], 
        [62, 24], [63, 25], [64, 26], [65, 26], [66, 26], [67, 25.5], [68, 25], [68.5, 23], [69, 21], 
        [68.5, 19.5], [68, 18], [66.5, 16], [65, 14], [65, 13], [65, 12], [64.5, 11], [64, 10], [64, 9], 
        [64, 8], [63.5, 9.5], [63, 11], [61.5, 11], [60, 11], [59, 9], [58, 7], [58, 6], [58, 5], [57.5, 6.5], 
        [57, 8], [56, 8.5], [55, 9], [54.5, 8.5], [54, 8], [54, 10], [54, 12], [55, 12], [56, 12], [56, 14], 
        [56, 16], [55, 17], [54, 18], [53, 16], [52, 14], [51.5, 9], [51, 4], [50.5, 3], [50, 2], [49, 0.5], 
        [48, -1], [46, -1], [44, -1], [43, -1.5], [42, -2], [40.5, -5.5], [39, -9], [37.5, -9.5], [36, -10]
    ],
    // Africa - Density increased significantly
    [
        [12, -17], [13.5, -17], [15, -17], [16.5, -16.5], [18, -16], [19, -14.5], [20, -13], [22, -14], 
        [24, -15], [26, -15], [28, -15], [29.5, -12.5], [31, -10], [32, -8.5], [33, -7], [34.5, -6], [36, -5], 
        [37.5, -3.5], [39, -2], [39.5, 0.5], [40, 3], [41, 6.5], [42, 10], [42, 12], [42, 14], [41.5, 17], 
        [41, 20], [39, 21], [37, 22], [34.5, 23], [32, 24], [31, 28.5], [30, 33], [28.5, 33.5], [27, 34], 
        [24.5, 35.5], [22, 37], [19, 37.5], [16, 38], [14, 41], [12, 44], [12, 46], [12, 48], [11, 46], 
        [10, 44], [7.5, 42], [5, 40], [3, 40], [1, 40], [-2, 39.5], [-5, 39], [-7.5, 39.5], [-10, 40], 
        [-12.5, 40], [-15, 40], [-17.5, 40], [-20, 40], [-22.5, 37.5], [-25, 35], [-25.5, 33.5], [-26, 32], 
        [-26, 30], [-26, 28], [-27, 26.5], [-28, 25], [-29, 23.5], [-30, 22], [-31, 20], [-32, 18], [-33, 18.5], 
        [-34, 19], [-34, 20.5], [-34, 22], [-31, 19.5], [-28, 17], [-26.5, 16], [-25, 15], [-23.5, 14.5], 
        [-22, 14], [-20, 13], [-18, 12], [-16.5, 12], [-15, 12], [-13.5, 12.5], [-12, 13], [-11, 13], [-10, 13], 
        [-9, 12.5], [-8, 12], [-7, 11], [-6, 10], [-5, 8.5], [-4, 7], [-3, 6.5], [-2, 6], [-1, 7], [0, 8], 
        [1, 8.5], [2, 9], [3.5, 7.5], [5, 6], [6.5, 4], [8, 2], [9, 1], [10, 0], [11, -1.5], [12, -3], 
        [11, -5.5], [10, -8], [10, -10], [10, -12], [10, -13.5], [10, -15], [11, -16], [12, -17]
    ],
    // Asia - Slightly reduced density
    [
        [30, 25], [29, 27.5], [28, 30], [29, 32.5], [30, 35], [31, 37.5], [32, 40], [33.5, 42.5], [35, 45], 
        [36.5, 46.5], [38, 48], [40, 49], [42, 50], [43.5, 52.5], [45, 55], [46.5, 56.5], [48, 58], [49, 59], 
        [50, 60], [52.5, 62.5], [55, 65], [56.5, 66.5], [58, 68], [59, 69], [60, 70], [62.5, 72.5], [65, 75], 
        [66.5, 76.5], [68, 78], [69, 79], [70, 80], [71, 82.5], [72, 85], [71, 87.5], [70, 90], [69, 92.5], 
        [68, 95], [66.5, 96.5], [65, 98], [63.5, 99], [62, 100], [61, 102.5], [60, 105], [59, 107.5], [58, 110], 
        [56.5, 112.5], [55, 115], [53.5, 117.5], [52, 120], [51, 122.5], [50, 125], [49, 127.5], [48, 130], 
        [46.5, 132.5], [45, 135], [43.5, 137.5], [42, 140], [40, 141], [38, 142], [36.5, 141], [35, 140], 
        [33.5, 138.5], [32, 137], [31, 136], [30, 135], [29, 132.5], [28, 130], [26.5, 127.5], [25, 125], 
        [23.5, 122.5], [22, 120], [20, 117.5], [18, 115], [16.5, 112.5], [15, 110], [13.5, 107.5], [12, 105], 
        [10, 102.5], [8, 100], [6.5, 97.5], [5, 95], [3.5, 96.5], [2, 98], [1, 99], [0, 100], [-1, 101], 
        [-2, 102], [-3.5, 103.5], [-5, 105], [-5.5, 106.5], [-6, 108], [-5.5, 109], [-5, 110], [-3.5, 111], 
        [-2, 112], [-1, 113.5], [0, 115], [1, 116.5], [2, 118], [3.5, 119], [5, 120], [6.5, 122.5], [8, 125], 
        [9, 126.5], [10, 128], [11, 129], [12, 130], [13.5, 132.5], [15, 135], [16.5, 136.5], [18, 138], 
        [19, 139], [20, 140], [21, 142.5], [22, 145], [23.5, 146.5], [25, 148], [26.5, 149], [28, 150], 
        [29, 149], [30, 148], [31, 146.5], [32, 145], [33.5, 142.5], [35, 140], [36.5, 137.5], [38, 135], 
        [39, 133.5], [40, 132], [41, 131], [42, 130], [41, 127.5], [40, 125], [39, 122.5], [38, 120], 
        [39, 117.5], [40, 115], [41, 113.5], [42, 112], [43.5, 111], [45, 110], [46.5, 107.5], [48, 105], 
        [49, 102.5], [50, 100], [51, 97.5], [52, 95], [53.5, 92.5], [55, 90], [56.5, 87.5], [58, 85], 
        [59, 82.5], [60, 80], [59, 77.5], [58, 75], [56.5, 72.5], [55, 70], [53.5, 67.5], [52, 65], 
        [51, 62.5], [50, 60], [49, 57.5], [48, 55], [46.5, 52.5], [45, 50], [43.5, 47.5], [42, 45], 
        [41, 42.5], [40, 40], [39, 37.5], [38, 35], [36.5, 32.5], [35, 30], [33.5, 27.5], [32, 25], [30, 25]
    ],
    // Australia - Density significantly increased
    [
        [-10, 112], [-11, 113.5], [-12, 115], [-13.5, 116.5], [-15, 118], [-16.5, 120], [-18, 122],
        [-19, 123.5], [-20, 125], [-21, 126.5], [-22, 128], [-23.5, 129], [-25, 130], [-26.5, 131],
        [-28, 132], [-29, 133.5], [-30, 135], [-31, 136.5], [-32, 138], [-33.5, 139], [-35, 140],
        [-36.5, 141], [-38, 142], [-39, 143.5], [-40, 145], [-41, 146.5], [-42, 148], [-41, 149],
        [-40, 150], [-39, 151], [-38, 152], [-36.5, 153.5], [-35, 155], [-33.5, 154], [-32, 153],
        [-31, 151.5], [-30, 150], [-29, 149], [-28, 148], [-26.5, 146.5], [-25, 145], [-23.5, 143.5],
        [-22, 142], [-21, 141], [-20, 140], [-19, 137.5], [-18, 135], [-16.5, 133.5], [-15, 132],
        [-13.5, 131], [-12, 130], [-11, 127.5], [-10, 125], [-9, 122.5], [-8, 120], [-9, 117.5],
        [-10, 115], [-10, 113.5], [-10, 112]
    ]
];