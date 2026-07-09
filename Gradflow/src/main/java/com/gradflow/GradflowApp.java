package com.gradflow;

import java.awt.BorderLayout;
import java.awt.EventQueue;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import javax.swing.WindowConstants;

public final class GradflowApp {
    private GradflowApp() {
    }

    public static void main(String[] args) {
        EventQueue.invokeLater(GradflowApp::showWindow);
    }

    private static void showWindow() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (ReflectiveOperationException | javax.swing.UnsupportedLookAndFeelException ignored) {
            UIManager.getDefaults();
        }

        JFrame frame = new JFrame("Gradflow");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setSize(640, 420);
        frame.setLocationRelativeTo(null);

        JLabel title = new JLabel("Gradflow", SwingConstants.CENTER);
        title.setFont(title.getFont().deriveFont(28.0f));

        JLabel subtitle = new JLabel("Java 21 desktop starter project", SwingConstants.CENTER);

        JButton closeButton = new JButton("Close");
        closeButton.addActionListener(event -> frame.dispose());

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.add(title, BorderLayout.NORTH);
        content.add(subtitle, BorderLayout.CENTER);
        content.add(closeButton, BorderLayout.SOUTH);
        content.setBorder(javax.swing.BorderFactory.createEmptyBorder(32, 32, 32, 32));

        frame.setContentPane(content);
        frame.setVisible(true);
    }
}
